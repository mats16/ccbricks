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
    const { default_new_user_is_admin } = request.body;

    if (typeof default_new_user_is_admin !== 'boolean') {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'default_new_user_is_admin must be a boolean',
        statusCode: 400,
      });
    }

    await updateAppSettings(fastify, default_new_user_is_admin);
    return reply.send({ success: true });
  });
};

export default adminRoute;
