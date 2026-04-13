import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import type { ResolvedDatabricksAppsOutcome } from '@repo/types';
import { SessionId } from '../models/session.model.js';
import { getSession } from '../services/session.service.js';
import { DatabricksAppsClient, DatabricksApiError } from '../lib/databricks-apps-client.js';
import { getAuthProvider } from '../lib/databricks-auth.js';

function sendError(
  reply: FastifyReply,
  statusCode: 401 | 404 | 500,
  error: string,
  message: string
): ReturnType<FastifyReply['send']> {
  return reply.status(statusCode).send({ error, message, statusCode });
}

function parseSessionId(sessionIdStr: string): SessionId | null {
  try {
    return SessionId.fromString(sessionIdStr);
  } catch {
    return null;
  }
}

const sessionAppRoute: FastifyPluginAsync = async fastify => {
  /**
   * GET /sessions/:session_id/app
   * セッションに関連付けられた Databricks App の情報を取得
   */
  fastify.get<{
    Params: { session_id: string };
  }>('/sessions/:session_id/app', async (request, reply) => {
    const { user } = request.ctx!;

    if (!user.id) {
      return sendError(reply, 401, 'Unauthorized', 'User ID not found in request context');
    }

    const sessionId = parseSessionId(request.params.session_id);
    if (!sessionId) {
      return sendError(reply, 404, 'NotFound', 'Session not found');
    }

    const session = await getSession(fastify, user.id, sessionId);
    if (!session) {
      return sendError(reply, 404, 'NotFound', 'Session not found');
    }

    const appsOutcome = session.session_context?.outcomes?.find(
      (o): o is ResolvedDatabricksAppsOutcome => o.type === 'databricks_apps'
    );
    if (!appsOutcome?.name) {
      return sendError(
        reply,
        404,
        'NotFound',
        'This session does not have Databricks Apps outcome configured'
      );
    }

    const authProvider = getAuthProvider(fastify);
    const appsClient = new DatabricksAppsClient(authProvider);

    try {
      const app = await appsClient.get(appsOutcome.name);
      if (!app) {
        return sendError(reply, 404, 'NotFound', `App '${appsOutcome.name}' not found`);
      }
      return reply.send(app);
    } catch (error) {
      if (error instanceof DatabricksApiError) {
        const code = error.statusCode === 404 ? 404 : 500;
        return sendError(
          reply,
          code,
          code === 404 ? 'NotFound' : 'InternalServerError',
          error.message
        );
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      return sendError(reply, 500, 'InternalServerError', message);
    }
  });
};

export default sessionAppRoute;
