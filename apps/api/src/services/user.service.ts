import type { FastifyInstance } from 'fastify';
import type { UserInfo } from '@repo/types';
import { eq } from 'drizzle-orm';
import { users, userSettings } from '../db/schema.js';
import { getDefaultNewUserIsAdmin } from './admin.service.js';

/**
 * ユーザーを取得または作成する
 *
 * users テーブルはRLS無効、user_settings はRLS有効。
 * withUserContext で RLS コンテキストを設定してから INSERT する。
 *
 * @param fastify - Fastify インスタンス
 * @param userInfo - リクエストから取得したユーザー情報（is_admin は無視される）
 * @returns UserInfo
 */
export async function getOrCreateUser(
  fastify: FastifyInstance,
  userInfo: Omit<UserInfo, 'is_admin'>
): Promise<UserInfo> {
  const { id, name, email } = userInfo;

  // 既存ユーザーチェック
  const [existingUser] = await fastify.db.select().from(users).where(eq(users.id, id)).limit(1);

  if (existingUser) {
    // email が変更されていたら更新
    if (email && existingUser.email !== email) {
      await fastify.db.update(users).set({ email }).where(eq(users.id, id));
    }
    return { id, name, email, is_admin: Boolean(existingUser.isAdmin) };
  }

  // 新規ユーザーのデフォルト Admin フラグを取得
  const isAdmin = await getDefaultNewUserIsAdmin(fastify);

  // 新規ユーザー作成（users + user_settings を withUserContext で）
  await fastify.withUserContext(id, async tx => {
    await tx.insert(users).values({ id, email, isAdmin: isAdmin }).onConflictDoNothing();
    await tx.insert(userSettings).values({ userId: id }).onConflictDoNothing();
  });

  return { id, name, email, is_admin: isAdmin };
}
