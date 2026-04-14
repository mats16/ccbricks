import { FastifyPluginAsync } from 'fastify';
import type {
  UserSettingsMcpUpdateRequest,
  UserSettingsMcpUpdateResponse,
  ApiError,
} from '@repo/types';
import { userSettingsMcp } from '../db/schema.js';

const userSettingsMcpRoute: FastifyPluginAsync = async fastify => {
  fastify.put<{
    Params: { id: string };
    Body: UserSettingsMcpUpdateRequest;
    Reply: UserSettingsMcpUpdateResponse | ApiError;
  }>('/user/settings/mcp/:id', async (request, reply) => {
    const { user } = request.ctx!;
    if (!user.id) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'User ID not found in request context',
        statusCode: 401,
      });
    }

    const { id: serverId } = request.params;
    const { enabled } = request.body;
    if (typeof enabled !== 'boolean') {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'enabled is required and must be a boolean',
        statusCode: 400,
      });
    }

    await fastify.db
      .insert(userSettingsMcp)
      .values({ userId: user.id, serverId, enabled })
      .onConflictDoUpdate({
        target: [userSettingsMcp.userId, userSettingsMcp.serverId],
        set: { enabled },
      });

    return reply.send({ server_id: serverId, enabled });
  });
};

export default userSettingsMcpRoute;
