import { FastifyPluginAsync } from 'fastify';
import type {
  AdminUserListResponse,
  UpdateUserRoleRequest,
  AppSettingsResponse,
  UpdateAppSettingsRequest,
  ApiError,
} from '@repo/types';
import { adminGuard } from '../hooks/admin-guard.js';
import {
  getAllUsers,
  updateUserIsAdmin,
  updateAppSettings,
  getAppSettings,
  LastAdminError,
} from '../services/admin.service.js';

const adminRoute: FastifyPluginAsync = async fastify => {
  const guard = adminGuard(fastify);

  // ユーザー一覧取得
  fastify.get<{ Reply: AdminUserListResponse | ApiError }>(
    '/admin/users',
    { preHandler: guard },
    async (_request, reply) => {
      const users = await getAllUsers(fastify);
      return reply.send({ users });
    }
  );

  // ユーザーのロール更新
  fastify.put<{
    Params: { id: string };
    Body: UpdateUserRoleRequest;
    Reply: { success: true } | ApiError;
  }>('/admin/users/:id/role', { preHandler: guard }, async (request, reply) => {
    const { id } = request.params;
    const { is_admin } = request.body;

    if (typeof is_admin !== 'boolean') {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'is_admin must be a boolean',
        statusCode: 400,
      });
    }

    try {
      await updateUserIsAdmin(fastify, id, is_admin);
      return reply.send({ success: true });
    } catch (error) {
      if (error instanceof LastAdminError) {
        return reply.status(400).send({
          error: 'BadRequest',
          message: error.message,
          statusCode: 400,
        });
      }
      throw error;
    }
  });

  // アプリ設定取得
  fastify.get<{ Reply: AppSettingsResponse | ApiError }>(
    '/admin/settings',
    { preHandler: guard },
    async (_request, reply) => {
      const settings = await getAppSettings(fastify);
      return reply.send(settings);
    }
  );

  // アプリ設定更新
  fastify.put<{
    Body: UpdateAppSettingsRequest;
    Reply: { success: true } | ApiError;
  }>('/admin/settings', { preHandler: guard }, async (request, reply) => {
    const body = request.body;

    // バリデーション: default_new_user_role
    if (
      body.default_new_user_role !== undefined &&
      body.default_new_user_role !== 'admin' &&
      body.default_new_user_role !== 'member'
    ) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: "default_new_user_role must be 'admin' or 'member'",
        statusCode: 400,
      });
    }

    // バリデーション: モデル設定（null か 非空文字列のみ許可）
    for (const key of [
      'default_opus_model',
      'default_sonnet_model',
      'default_haiku_model',
    ] as const) {
      const value = body[key];
      if (value !== undefined && value !== null && (typeof value !== 'string' || value === '')) {
        return reply.status(400).send({
          error: 'BadRequest',
          message: `${key} must be a non-empty string or null`,
          statusCode: 400,
        });
      }
    }

    await updateAppSettings(fastify, body);
    return reply.send({ success: true });
  });
};

export default adminRoute;
