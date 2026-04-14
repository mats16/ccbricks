import type { FastifyInstance } from 'fastify';
import type { AdminUserInfo, AppSettingsResponse } from '@repo/types';
import { and, eq, sql } from 'drizzle-orm';
import { users, appSettings } from '../db/schema.js';

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
  const [row] = await fastify.db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, 'default_new_user_is_admin'))
    .limit(1);

  return {
    default_new_user_is_admin: row ? row.value === 'true' : true,
  };
}

/**
 * アプリケーション設定を更新する
 */
export async function updateAppSettings(
  fastify: FastifyInstance,
  defaultNewUserIsAdmin: boolean
): Promise<void> {
  const value = String(defaultNewUserIsAdmin);

  await fastify.db
    .insert(appSettings)
    .values({ key: 'default_new_user_is_admin', value })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value },
    });
}

/**
 * 新規ユーザーのデフォルト Admin フラグを取得する
 */
export async function getDefaultNewUserIsAdmin(fastify: FastifyInstance): Promise<boolean> {
  const settings = await getAppSettings(fastify);
  return settings.default_new_user_is_admin;
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
