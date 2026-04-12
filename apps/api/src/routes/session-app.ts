import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import type { DatabricksAppsOutcome } from '@repo/types';
import { SessionId } from '../models/session.model.js';
import { getSession } from '../services/session.service.js';
import { DatabricksAppsClient } from '../lib/databricks-apps-client.js';
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
      (o): o is DatabricksAppsOutcome => o.type === 'databricks_apps'
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
      const message = error instanceof Error ? error.message : 'Unknown error';
      const statusMatch = message.match(/\((\d+)\)/);
      const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 500;
      return sendError(
        reply,
        statusCode === 404 ? 404 : 500,
        statusCode === 404 ? 'NotFound' : 'InternalServerError',
        message
      );
    }
  });
};

export default sessionAppRoute;
