import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type {
  WorkspaceListQuerystring,
  WorkspaceGetStatusQuerystring,
  WorkspaceMkdirsRequest,
} from '@repo/types';
import { createUserContext } from '../lib/user-context.js';

/**
 * Validate workspace path
 * - Must not be empty
 * - Must start with /
 * - Must not contain path traversal patterns
 */
function validatePath(path: string, reply: FastifyReply): boolean {
  if (!path || path.trim() === '') {
    reply.status(400).send({
      error: 'Bad Request',
      message: 'path is required',
      statusCode: 400,
    });
    return false;
  }

  if (!path.startsWith('/')) {
    reply.status(400).send({
      error: 'Bad Request',
      message: 'path must start with /',
      statusCode: 400,
    });
    return false;
  }

  if (path.includes('..')) {
    reply.status(400).send({
      error: 'Bad Request',
      message: 'path must not contain ..',
      statusCode: 400,
    });
    return false;
  }

  return true;
}

const workspaceRoute: FastifyPluginAsync = async fastify => {
  const databricksHost = fastify.config.DATABRICKS_HOST;

  /**
   * OBO トークンを取得する。取得できない場合は 401 を返す。
   */
  function getOboToken(request: FastifyRequest, reply: FastifyReply): string | undefined {
    const ctx = createUserContext(fastify, request);
    const token = ctx.oboAccessToken;
    if (!token) {
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'OBO access token is not available',
        statusCode: 401,
      });
      return undefined;
    }
    return token;
  }

  // GET /workspace/list
  fastify.get<{
    Querystring: WorkspaceListQuerystring;
  }>('/workspace/list', async (request, reply) => {
    if (!validatePath(request.query.path, reply)) return;

    const token = getOboToken(request, reply);
    if (!token) return;

    const url = new URL('/api/2.0/workspace/list', `https://${databricksHost}`);
    url.searchParams.set('path', request.query.path);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return reply.status(response.status).send(data);
  });

  // GET /workspace/get-status
  fastify.get<{
    Querystring: WorkspaceGetStatusQuerystring;
  }>('/workspace/get-status', async (request, reply) => {
    if (!validatePath(request.query.path, reply)) return;

    const token = getOboToken(request, reply);
    if (!token) return;

    const url = new URL('/api/2.0/workspace/get-status', `https://${databricksHost}`);
    url.searchParams.set('path', request.query.path);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return reply.status(response.status).send(data);
  });

  // POST /workspace/mkdirs
  fastify.post<{
    Body: WorkspaceMkdirsRequest;
  }>('/workspace/mkdirs', async (request, reply) => {
    if (!validatePath(request.body.path, reply)) return;

    const token = getOboToken(request, reply);
    if (!token) return;

    const url = new URL('/api/2.0/workspace/mkdirs', `https://${databricksHost}`);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ path: request.body.path }),
    });

    const data = await response.json();
    return reply.status(response.status).send(data);
  });
};

export default workspaceRoute;
