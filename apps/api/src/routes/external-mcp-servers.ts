import { FastifyPluginAsync } from 'fastify';
import { createUserContext } from '../lib/user-context.js';
import type { ExternalMcpServer, ExternalMcpServerListResponse, ApiError } from '@repo/types';

/** Unity Catalog Connection (バックエンド内部用) */
interface UnityCatalogConnection {
  connection_id: string;
  name: string;
  full_name: string;
  connection_type: string;
  options: {
    is_mcp_connection?: string;
    host?: string;
    base_path?: string;
    port?: string;
    auth_scheme?: string;
  };
  url: string;
  owner: string;
  provisioning_info?: {
    state: string;
  };
}

interface DatabricksConnectionsResponse {
  connections?: UnityCatalogConnection[];
  next_page_token?: string;
}

const MAX_PAGES = 100;

const externalMcpServersRoute: FastifyPluginAsync = async fastify => {
  const databricksHost = fastify.config.DATABRICKS_HOST;

  fastify.get<{ Reply: ExternalMcpServerListResponse | ApiError }>(
    '/mcp-servers',
    async (request, reply) => {
      const ctx = createUserContext(fastify, request);
      const oboToken = ctx.oboAccessToken;

      if (!oboToken) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'OBO token is not available',
          statusCode: 401,
        });
      }

      const allServers: ExternalMcpServer[] = [];
      let pageToken: string | undefined;
      let pageCount = 0;

      do {
        const url = new URL('/api/2.1/unity-catalog/connections', `https://${databricksHost}`);
        if (pageToken) {
          url.searchParams.set('page_token', pageToken);
        }

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${oboToken}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          return reply.status(response.status).send({
            error: 'DatabricksApiError',
            message: errorText || `Databricks API returned ${response.status}`,
            statusCode: response.status,
          } as ApiError);
        }

        const data = (await response.json()) as DatabricksConnectionsResponse;
        const connections = data.connections ?? [];

        for (const conn of connections) {
          if (conn.options?.is_mcp_connection === 'true') {
            allServers.push({
              id: conn.connection_id,
              name: conn.name,
              url: conn.url,
              owner: conn.owner,
            });
          }
        }

        pageToken = data.next_page_token;
        pageCount++;
      } while (pageToken && pageCount < MAX_PAGES);

      return reply.send({ mcp_servers: allServers });
    }
  );
};

export default externalMcpServersRoute;
