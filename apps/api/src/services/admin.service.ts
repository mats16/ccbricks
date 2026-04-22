import type { FastifyInstance } from 'fastify';
import type { AdminUserInfo, AppSettingsResponse, UpdateAppSettingsRequest } from '@repo/types';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { users, appSettings } from '../db/schema.js';

const MODEL_SETTINGS_KEYS = [
  'default_opus_model',
  'default_sonnet_model',
  'default_haiku_model',
] as const;

const ALL_SETTINGS_KEYS = ['default_new_user_role', ...MODEL_SETTINGS_KEYS] as const;

/**
 * 全ユーザーを取得する（管理者用）
 * users テーブルは RLS 無効のため、全ユーザーを直接取得可能
 */
export async function getAllUsers(fastify: FastifyInstance): Promise<AdminUserInfo[]> {
  const rows = await fastify.db
    .select({
      id: users.id,
      email: users.email,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  return rows.map(row => ({
    id: row.id,
    email: row.email ?? null,
    is_admin: Boolean(row.isAdmin),
    created_at: (row.createdAt as Date).toISOString(),
  }));
}

/**
 * ユーザーの Admin フラグを更新する
 * 最後の Admin の降格を防止する
 */
export async function updateUserIsAdmin(
  fastify: FastifyInstance,
  userId: string,
  isAdmin: boolean
): Promise<void> {
  if (!isAdmin) {
    // 対象が唯一の Admin なら降格を拒否（1クエリで判定）
    const [countResult] = await fastify.db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.isAdmin, true), sql`${users.id} != ${userId}`));

    if (Number(countResult.count) === 0) {
      throw new LastAdminError();
    }
  }

  await fastify.db.update(users).set({ isAdmin }).where(eq(users.id, userId));
}

/**
 * アプリケーション設定を取得する
 */
export async function getAppSettings(fastify: FastifyInstance): Promise<AppSettingsResponse> {
  const rows = await fastify.db
    .select({ key: appSettings.key, value: appSettings.value })
    .from(appSettings)
    .where(inArray(appSettings.key, [...ALL_SETTINGS_KEYS]));

  const map = new Map(rows.map(r => [r.key, r.value]));
  const roleValue = map.get('default_new_user_role');

  return {
    default_new_user_role: roleValue === 'admin' || roleValue === 'member' ? roleValue : 'admin',
    default_opus_model: map.get('default_opus_model') ?? null,
    default_sonnet_model: map.get('default_sonnet_model') ?? null,
    default_haiku_model: map.get('default_haiku_model') ?? null,
  };
}

/**
 * アプリケーション設定を更新する
 *
 * 各フィールドが存在する場合のみ更新。null の場合はキーを削除（デフォルトに戻す）。
 */
export async function updateAppSettings(
  fastify: FastifyInstance,
  settings: UpdateAppSettingsRequest
): Promise<void> {
  const entries: Array<{ key: string; value: string | null }> = [];

  for (const key of ALL_SETTINGS_KEYS) {
    const value = settings[key];
    if (value !== undefined) {
      entries.push({ key, value: value ?? null });
    }
  }

  for (const entry of entries) {
    if (entry.value === null) {
      // null の場合はキーを削除（環境変数デフォルトに戻す）
      await fastify.db.delete(appSettings).where(eq(appSettings.key, entry.key));
    } else {
      await fastify.db
        .insert(appSettings)
        .values({ key: entry.key, value: entry.value })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: { value: entry.value },
        });
    }
  }
}

/**
 * 新規ユーザーのデフォルトロールが Admin かどうかを取得する
 */
export async function getDefaultNewUserIsAdmin(fastify: FastifyInstance): Promise<boolean> {
  const settings = await getAppSettings(fastify);
  return settings.default_new_user_role === 'admin';
}

/**
 * セッション・タイトル生成で使用するモデル設定
 */
export interface ModelSettings {
  opusModel: string;
  sonnetModel: string;
  haikuModel: string;
}

const MODEL_DEFAULTS = {
  default_opus_model: 'databricks-claude-opus-4-6',
  default_sonnet_model: 'databricks-claude-sonnet-4-6',
  default_haiku_model: 'databricks-claude-haiku-4-5',
} as const;

/**
 * モデル設定を取得する
 *
 * DB から読み取り、未設定の場合はハードコードデフォルトにフォールバックする。
 */
export async function getModelSettings(fastify: FastifyInstance): Promise<ModelSettings> {
  const settings = await getAppSettings(fastify);

  return {
    opusModel: settings.default_opus_model ?? MODEL_DEFAULTS.default_opus_model,
    sonnetModel: settings.default_sonnet_model ?? MODEL_DEFAULTS.default_sonnet_model,
    haikuModel: settings.default_haiku_model ?? MODEL_DEFAULTS.default_haiku_model,
  };
}

/**
 * 最後の Admin を降格しようとした場合のエラー
 */
export class LastAdminError extends Error {
  constructor() {
    super('Cannot remove the last admin');
    this.name = 'LastAdminError';
  }
}
