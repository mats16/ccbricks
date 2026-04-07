import type { FastifyInstance } from 'fastify';
import type { UserInfo } from '@repo/types';
import { eq } from 'drizzle-orm';
import { users, userSettings } from '../db/schema.js';

/**
 * ユーザーを取得または作成する
 *
 * users テーブルはRLS無効、user_settings はRLS有効。
 * withUserContext で RLS コンテキストを設定してから INSERT する。
 *
 * @param fastify - Fastify インスタンス
 * @param userInfo - リクエストから取得したユーザー情報
 * @returns UserInfo
 */
export async function getOrCreateUser(
  fastify: FastifyInstance,
  userInfo: UserInfo
): Promise<UserInfo> {
  const { id, name, email } = userInfo;

  // 既存ユーザーチェック
  const [existingUser] = await fastify.db.select().from(users).where(eq(users.id, id)).limit(1);

  if (existingUser) {
    return { id, name, email };
  }

  // 新規ユーザー作成（users + user_settings を withUserContext で）
  await fastify.withUserContext(id, async tx => {
    await tx.insert(users).values({ id }).onConflictDoNothing();
    await tx.insert(userSettings).values({ userId: id }).onConflictDoNothing();
  });

  return { id, name, email };
}
