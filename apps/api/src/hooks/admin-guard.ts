import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema.js';

/**
 * Admin 専用ルートの認可フック
 * users.is_admin が true でない場合は 403 を返す
 */
export function adminGuard(fastify: FastifyInstance) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.ctx?.user.id;
    if (!userId) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Not authenticated',
        statusCode: 401,
      });
    }

    const [user] = await fastify.db
      .select({ isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.isAdmin) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Admin access required',
        statusCode: 403,
      });
    }
  };
}
