// apps/api/src/plugins/database.ts
import fp from 'fastify-plugin';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as pgSchema from '../db/schema.pg.js';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * RLS対応トランザクションの型
 * Drizzle ORM のトランザクション内で使用可能なDB操作
 */
export type RLSTransaction = Parameters<
  Parameters<PostgresJsDatabase<typeof pgSchema>['transaction']>[0]
>[0];

/**
 * withUserContext のコールバック型
 */
export type WithUserContextCallback<T> = (tx: RLSTransaction) => Promise<T>;

/**
 * RLSコンテキスト設定エラー
 * ユーザーコンテキストの設定に失敗した場合にスローされる
 */
export class RLSContextError extends Error {
  constructor(
    message: string,
    public readonly userId: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'RLSContextError';
  }
}

// Fastify型拡張
declare module 'fastify' {
  interface FastifyInstance {
    db: PostgresJsDatabase<typeof pgSchema>;
    /** true の場合、SQLite フォールバックモードで動作中 */
    isSqlite: boolean;
    /**
     * RLS対応のユーザーコンテキスト付きトランザクションを実行
     *
     * PostgreSQL: セッション変数 `app.user_id` を設定し、RLSポリシーによるデータ分離を有効にする
     * SQLite: RLS なしの通常トランザクション（開発用）
     *
     * @param userId - ユーザーID（RLSポリシーで使用）
     * @param callback - トランザクション内で実行するコールバック
     * @returns コールバックの戻り値
     */
    withUserContext: <T>(userId: string, callback: WithUserContextCallback<T>) => Promise<T>;
  }
}

/**
 * userId バリデーション（PG/SQLite 共通）
 */
function validateUserId(userId: string): void {
  if (!userId || typeof userId !== 'string') {
    throw new RLSContextError('Invalid userId: must be a non-empty string', userId ?? '');
  }
  if (userId.trim() === '') {
    throw new RLSContextError('Invalid userId: cannot be empty or whitespace only', userId);
  }
}

/**
 * SQLite データベースを初期化する
 */
async function initSqlite(fastify: ReturnType<typeof import('fastify').default>) {
  const { default: Database } = await import('better-sqlite3');
  const { drizzle: drizzleSqlite } = await import('drizzle-orm/better-sqlite3');
  const sqliteSchema = await import('../db/schema.sqlite.js');

  // データディレクトリを確保
  const dataDir = path.join(fastify.config.LAKEBROWNIE_BASE_DIR, 'db');
  const { mkdirSync } = await import('fs');
  mkdirSync(dataDir, { recursive: true });

  const dbPath = path.join(dataDir, 'lakebrownie.sqlite');
  fastify.log.info({ dbPath }, 'Using SQLite database (DATABASE_URL not set)');

  // SQLite クライアント作成
  const client = new Database(dbPath);

  // WAL モード & 外部キー制約を有効化 & ロック待機タイムアウト設定
  client.pragma('journal_mode = WAL');
  client.pragma('foreign_keys = ON');
  client.pragma('busy_timeout = 5000');

  // テーブル作成（CREATE TABLE IF NOT EXISTS）
  client.exec(`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" TEXT PRIMARY KEY,
      "created_at" INTEGER NOT NULL DEFAULT (unixepoch()),
      "updated_at" INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS "user_settings" (
      "user_id" TEXT PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
      "claude_config_backup" TEXT NOT NULL DEFAULT 'auto',
      "created_at" INTEGER NOT NULL DEFAULT (unixepoch()),
      "updated_at" INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS "sessions" (
      "id" TEXT PRIMARY KEY,
      "user_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
      "title" TEXT,
      "status" TEXT NOT NULL DEFAULT 'init',
      "sdk_session_id" TEXT,
      "context" TEXT,
      "created_at" INTEGER NOT NULL DEFAULT (unixepoch()),
      "updated_at" INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS "session_events" (
      "uuid" TEXT PRIMARY KEY,
      "session_id" TEXT NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
      "type" TEXT NOT NULL,
      "subtype" TEXT,
      "message" TEXT NOT NULL,
      "created_at" INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id");
    CREATE INDEX IF NOT EXISTS "sessions_updated_at_idx" ON "sessions" ("updated_at");
    CREATE INDEX IF NOT EXISTS "sessions_status_idx" ON "sessions" ("status");
    CREATE INDEX IF NOT EXISTS "session_events_session_created_at_idx" ON "session_events" ("session_id", "created_at");
  `);

  // Drizzle ORM 初期化
  const db = drizzleSqlite({ client, schema: sqliteSchema });

  // Fastify インスタンスにデコレート（PG 型にキャスト）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fastify.decorate('db', db as any);
  fastify.decorate('isSqlite', true);

  // SQLite 用 withUserContext（RLS なし、トランザクション不要）
  // better-sqlite3 のトランザクションは同期のみ対応のため、db を直接渡す
  fastify.decorate(
    'withUserContext',
    async <T>(userId: string, callback: WithUserContextCallback<T>): Promise<T> => {
      validateUserId(userId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return callback(db as any);
    }
  );

  fastify.log.info('SQLite database initialized');

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    fastify.log.info('Closing SQLite database...');
    client.close();
    fastify.log.info('SQLite database closed');
  });
}

/**
 * PostgreSQL データベースを初期化する
 */
async function initPostgres(fastify: ReturnType<typeof import('fastify').default>) {
  // PostgreSQLクライアント作成
  const client = postgres(fastify.config.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  // Drizzle ORM初期化
  const db = drizzlePg({ client, schema: pgSchema });

  // マイグレーション実行（テスト環境または DISABLE_AUTO_MIGRATION=true ではスキップ）
  const shouldSkipMigration =
    fastify.config.NODE_ENV === 'test' || fastify.config.DISABLE_AUTO_MIGRATION;

  if (!shouldSkipMigration) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const migrationsFolder = path.join(__dirname, '../../migrations');
    fastify.log.info({ migrationsFolder }, 'Running database migrations...');

    await migrate(db, { migrationsFolder });

    fastify.log.info('Database migrations completed');
  } else {
    const reason = fastify.config.DISABLE_AUTO_MIGRATION
      ? 'DISABLE_AUTO_MIGRATION is set'
      : 'test environment';
    fastify.log.info({ reason }, 'Skipping database migrations');
  }

  // Fastifyインスタンスにデコレート
  fastify.decorate('db', db);
  fastify.decorate('isSqlite', false);

  // RLS対応のユーザーコンテキスト付きトランザクションヘルパー
  fastify.decorate(
    'withUserContext',
    async <T>(userId: string, callback: WithUserContextCallback<T>): Promise<T> => {
      validateUserId(userId);

      return db.transaction(async tx => {
        try {
          await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`);
        } catch (error) {
          throw new RLSContextError(
            `Failed to set RLS context for user: ${error instanceof Error ? error.message : 'Unknown error'}`,
            userId,
            error instanceof Error ? error : undefined
          );
        }

        return callback(tx);
      });
    }
  );

  fastify.log.info('PostgreSQL database connection established');

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    fastify.log.info('Closing PostgreSQL database connection...');
    await client.end();
    fastify.log.info('PostgreSQL database connection closed');
  });
}

/**
 * Database Plugin
 *
 * DATABASE_URL が設定されている場合は PostgreSQL、
 * 未設定の場合は SQLite にフォールバックします。
 *
 * 依存関係:
 * - config: DATABASE_URLを取得するため
 */
export default fp(
  async fastify => {
    try {
      if (fastify.config.DATABASE_URL) {
        await initPostgres(fastify);
      } else {
        if (fastify.config.NODE_ENV === 'production') {
          throw new Error(
            'DATABASE_URL is required in production environment. SQLite fallback is only available in development.'
          );
        }
        fastify.log.warn('DATABASE_URL is not set — using SQLite fallback (development only)');
        await initSqlite(fastify);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      fastify.log.error({ message }, 'Failed to initialize database connection');
      throw error;
    }
  },
  {
    name: 'db',
    dependencies: ['config'],
  }
);
