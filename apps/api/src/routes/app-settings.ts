import { FastifyPluginAsync } from 'fastify';
import type { ApiError, AppPublicSettingsResponse } from '@repo/types';
import { getPublicAppSettings } from '../services/admin.service.js';

const appSettingsRoute: FastifyPluginAsync = async fastify => {
  fastify.get<{ Reply: AppPublicSettingsResponse | ApiError }>(
    '/app-settings',
    async (_request, reply) => {
      const settings = await getPublicAppSettings(fastify);
      return reply.send(settings);
    }
  );
};

export default appSettingsRoute;
