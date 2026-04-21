import type { FastifyInstance } from 'fastify';
import { and, eq, inArray } from 'drizzle-orm';
import type { McpServerEntry, McpServerType } from '@repo/types';
import { mcpServers } from '../db/schema.js';

/**
 * MCP サーバー ID の配列から DB の完全な設定（headers/env を含む）を解決する。
 * is_disabled なサーバーはスキップする。
 */
export async function resolveMcpServersFromDb(
  fastify: FastifyInstance,
  userId: string,
  serverIds: string[]
): Promise<Record<string, McpServerEntry>> {
  if (serverIds.length === 0) return {};

  const rows = await fastify.db
    .select()
    .from(mcpServers)
    .where(and(eq(mcpServers.userId, userId), inArray(mcpServers.id, serverIds)));

  const result: Record<string, McpServerEntry> = {};

  for (const row of rows) {
    if (row.isDisabled) continue;

    const type = row.type as McpServerType;
    if (type === 'stdio') {
      result[row.id] = {
        type: 'stdio',
        command: row.command ?? undefined,
        args: (row.args as string[]) ?? undefined,
        env: (row.env as Record<string, string>) ?? undefined,
      };
    } else {
      result[row.id] = {
        type,
        url: row.url ?? undefined,
        headers: (row.headers as Record<string, string>) ?? undefined,
      };
    }
  }

  return result;
}
