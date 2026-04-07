import { FastifyPluginAsync } from 'fastify';
import { createUserContext } from '../lib/user-context.js';

const genieRoute: FastifyPluginAsync = async fastify => {
  const databricksHost = fastify.config.DATABRICKS_HOST;

  // GET /genie/spaces - Genie スペース一覧
  fastify.get('/genie/spaces', async (request, reply) => {
    const ctx = createUserContext(fastify, request);
    const oboToken = ctx.oboAccessToken;

    if (!oboToken) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'OBO token is not available',
        statusCode: 401,
      });
    }

    const url = new URL('/api/2.0/genie/spaces', `https://${databricksHost}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${oboToken}`,
      },
    });

    const data = await response.json();
    return reply.status(response.status).send(data);
  });
};

export default genieRoute;
