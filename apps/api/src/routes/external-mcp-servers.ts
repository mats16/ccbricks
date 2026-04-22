import { FastifyPluginAsync } from 'fastify';
import { createUserContext } from '../lib/user-context.js';
import { TtlCache } from '../lib/ttl-cache.js';
import { sanitizeToIdSegment } from '../utils/sanitize.js';
import type { ExternalMcpServer, ExternalMcpServerListResponse, ApiError } from '@repo/types';

/** Unity Catalog Connection (バックエンド内部用) */
interface UnityCatalogConnection {
  connection_id: string;
  name: string;
  full_name: string;
  connection_type: string;
  options: Record<string, string>;
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

const CACHE_TTL_MS = 5 * 60 * 1000;

const externalMcpServersRoute: FastifyPluginAsync = async fastify => {
  const databricksHost = fastify.config.DATABRICKS_HOST;
  const cache = new TtlCache<ExternalMcpServer[]>(CACHE_TTL_MS);

  fastify.addHook('onClose', async () => {
    cache.dispose();
  });

  fastify.get<{
    Querystring: { refresh?: string };
    Reply: ExternalMcpServerListResponse | ApiError;
  }>('/mcp-servers', async (request, reply) => {
    const ctx = createUserContext(fastify, request);
    const oboToken = ctx.oboAccessToken;

    if (!oboToken) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'OBO token is not available',
        statusCode: 401,
      });
    }

    const forceRefresh = request.query.refresh === 'true';
    if (!forceRefresh) {
      const cached = cache.get(ctx.userId);
      if (cached) {
        return reply.send({ mcp_servers: cached });
      }
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
          const sanitized = sanitizeToIdSegment(conn.name);
          const gatewayUrl = `https://${databricksHost}/api/2.0/mcp/external/${conn.name}`;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { is_mcp_connection: _mcp, ...filteredOptions } = conn.options;

          allServers.push({
            id: sanitized ? `external_${sanitized}` : conn.connection_id,
            name: conn.name,
            url: gatewayUrl,
            owner: conn.owner,
            options: Object.keys(filteredOptions).length > 0 ? filteredOptions : undefined,
          });
        }
      }

      pageToken = data.next_page_token;
      pageCount++;
    } while (pageToken && pageCount < MAX_PAGES);

    cache.set(ctx.userId, allServers);
    return reply.send({ mcp_servers: allServers });
  });
};

export default externalMcpServersRoute;
