// apps/api/src/db/schema.ts
// 環境に応じて PostgreSQL or SQLite のスキーマを re-export するバレルモジュール
//
// DATABASE_URL が設定されている場合は PostgreSQL スキーマ、
// 未設定の場合は SQLite スキーマを使用する。
//
// サービスからの import パス（'../db/schema.js'）は変更不要。

const useSqlite = !process.env.DATABASE_URL;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mod: any = useSqlite ? await import('./schema.sqlite.js') : await import('./schema.pg.js');

export const users = mod.users;
export const userSettings = mod.userSettings;
export const sessions = mod.sessions;
export const sessionEvents = mod.sessionEvents;

// 行型は PG スキーマから re-export（canonical types）
export type {
  InsertUser,
  User,
  InsertUserSettings,
  UserSettings,
  InsertSession,
  Session,
  InsertSessionEvent,
  SessionEvent,
} from './schema.pg.js';
