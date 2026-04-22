import { FastifyPluginAsync } from 'fastify';
import type { GenerateTitleRequest, GenerateTitleResponse, ApiError } from '@repo/types';
import { TitleService } from '../services/title.service.js';
import { createUserContext } from '../lib/user-context.js';
import { getModelSettings } from '../services/admin.service.js';

const titleRoute: FastifyPluginAsync = async fastify => {
  const titleService = new TitleService({
    databricksHost: fastify.config.DATABRICKS_HOST,
  });

  fastify.post<{
    Body: GenerateTitleRequest;
    Reply: GenerateTitleResponse | ApiError;
  }>('/generate_title', async (request, reply) => {
    const { first_session_message } = request.body;

    // Validation
    if (!first_session_message || typeof first_session_message !== 'string') {
      const error: ApiError = {
        error: 'ValidationError',
        message: 'first_session_message is required and must be a non-empty string',
        statusCode: 400,
      };
      return reply.status(400).send(error);
    }

    // SP トークンを取得
    const ctx = createUserContext(fastify, request);
    const authProvider = ctx.getAuthProvider();
    let accessToken: string;
    try {
      accessToken = await authProvider.getToken();
    } catch {
      const error: ApiError = {
        error: 'Unauthorized',
        message: 'Access token is required (Service Principal)',
        statusCode: 401,
      };
      return reply.status(401).send(error);
    }

    try {
      const modelSettings = await getModelSettings(fastify);
      const result = await titleService.generateTitle({
        firstSessionMessage: first_session_message,
        accessToken,
        model: modelSettings.haikuModel,
      });

      return reply.send(result);
    } catch (error) {
      fastify.log.error(error, 'Failed to generate title');

      const apiError: ApiError = {
        error: 'InternalServerError',
        message: 'Failed to generate title',
        statusCode: 500,
      };
      return reply.status(500).send(apiError);
    }
  });
};

export default titleRoute;
