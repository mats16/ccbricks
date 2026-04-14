import { FastifyPluginAsync } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import type {
  McpServerCreateRequest,
  McpServerUpdateRequest,
  McpServerRecord,
  McpServerListResponse,
  McpServerType,
  ManagedMcpType,
  ApiError,
} from '@repo/types';
import { mcpServers, type InsertMcpServer } from '../db/schema.js';
import { adminGuard } from '../hooks/admin-guard.js';

const VALID_TYPES: McpServerType[] = ['stdio', 'http', 'sse'];
const VALID_MANAGED_TYPES: ManagedMcpType[] = ['dbsql', 'genie', 'vector_search'];
/** 小文字英数とアンダースコアのみ、連続アンダースコア禁止 */
const VALID_ID_PATTERN = /^[a-z0-9]+(_[a-z0-9]+)*$/;

function toRecord(row: typeof mcpServers.$inferSelect): McpServerRecord {
  return {
    id: row.id,
    display_name: row.displayName,
    type: row.type as McpServerType,
    managed_type: (row.managedType as ManagedMcpType) ?? undefined,
    url: row.url ?? undefined,
    headers: (row.headers as Record<string, string>) ?? undefined,
    command: row.command ?? undefined,
    args: (row.args as string[]) ?? undefined,
    env: (row.env as Record<string, string>) ?? undefined,
    created_by: row.createdBy,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

const mcpServersRoute: FastifyPluginAsync = async fastify => {
  const guard = adminGuard(fastify);

  // 全ユーザー: 登録済みサーバー一覧
  fastify.get<{ Reply: McpServerListResponse | ApiError }>(
    '/mcp-servers',
    async (request, reply) => {
      const { user } = request.ctx!;
      if (!user.id) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User ID not found in request context',
          statusCode: 401,
        });
      }

      const rows = await fastify.db.select().from(mcpServers).orderBy(desc(mcpServers.createdAt));

      return reply.send({ mcp_servers: rows.map(toRecord) });
    }
  );

  // 管理者のみ: サーバー登録
  fastify.post<{
    Body: McpServerCreateRequest;
    Reply: McpServerRecord | ApiError;
  }>('/mcp-servers', { preHandler: guard }, async (request, reply) => {
    const { user } = request.ctx!;
    const { managed_type } = request.body;

    // --- Managed MCP サーバー登録 ---
    if (managed_type) {
      if (!VALID_MANAGED_TYPES.includes(managed_type)) {
        return reply.status(400).send({
          error: 'BadRequest',
          message: `managed_type must be one of: ${VALID_MANAGED_TYPES.join(', ')}`,
          statusCode: 400,
        });
      }

      if (managed_type === 'vector_search') {
        return reply.status(501).send({
          error: 'NotImplemented',
          message: 'Vector Search MCP is not yet available',
          statusCode: 501,
        });
      }

      const { display_name } = request.body;
      if (!display_name || typeof display_name !== 'string' || !display_name.trim()) {
        return reply.status(400).send({
          error: 'BadRequest',
          message: 'display_name is required',
          statusCode: 400,
        });
      }

      const databricksHost = fastify.config.DATABRICKS_HOST;
      let generatedId: string;
      let generatedUrl: string;

      if (managed_type === 'dbsql') {
        generatedId = 'dbsql';
        generatedUrl = `https://${databricksHost}/api/2.0/mcp/sql`;
      } else {
        // Genie Space: id に space_id を渡す
        const genieSpaceId = request.body.id;
        if (!genieSpaceId || typeof genieSpaceId !== 'string' || !genieSpaceId.trim()) {
          return reply.status(400).send({
            error: 'BadRequest',
            message: 'id (genie_space_id) is required for genie type',
            statusCode: 400,
          });
        }
        const trimmedSpaceId = genieSpaceId.trim();
        generatedId = `genie_${trimmedSpaceId}`;
        generatedUrl = `https://${databricksHost}/api/2.0/mcp/genie/${trimmedSpaceId}`;
      }

      // PK ルックアップで重複チェック
      const existing = await fastify.db
        .select({ id: mcpServers.id })
        .from(mcpServers)
        .where(eq(mcpServers.id, generatedId));
      if (existing.length > 0) {
        return reply.status(409).send({
          error: 'Conflict',
          message: `MCP server "${generatedId}" is already registered`,
          statusCode: 409,
        });
      }

      const [row] = await fastify.db
        .insert(mcpServers)
        .values({
          id: generatedId,
          displayName: display_name.trim(),
          type: 'http',
          url: generatedUrl,
          managedType: managed_type,
          createdBy: user.id,
        })
        .returning();

      return reply.status(201).send(toRecord(row));
    }

    // --- Custom MCP サーバー登録 ---
    const { id, display_name, type, url, headers, command, args, env } = request.body;

    if (!id || typeof id !== 'string' || !id.trim()) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'id is required',
        statusCode: 400,
      });
    }

    if (!VALID_ID_PATTERN.test(id.trim())) {
      return reply.status(400).send({
        error: 'BadRequest',
        message:
          'id must contain only lowercase alphanumeric characters and single underscores (no consecutive underscores)',
        statusCode: 400,
      });
    }

    if (!display_name || typeof display_name !== 'string' || !display_name.trim()) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'display_name is required',
        statusCode: 400,
      });
    }

    if (!type || !VALID_TYPES.includes(type)) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: `type must be one of: ${VALID_TYPES.join(', ')}`,
        statusCode: 400,
      });
    }

    if ((type === 'http' || type === 'sse') && (!url || !url.trim())) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'url is required for http/sse type',
        statusCode: 400,
      });
    }

    if (type === 'stdio' && (!command || !command.trim())) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'command is required for stdio type',
        statusCode: 400,
      });
    }

    const [row] = await fastify.db
      .insert(mcpServers)
      .values({
        id: id.trim(),
        displayName: display_name.trim(),
        type,
        url: url?.trim() || null,
        headers: headers ?? null,
        command: command?.trim() || null,
        args: args ?? null,
        env: env ?? null,
        createdBy: user.id,
      })
      .returning();

    return reply.status(201).send(toRecord(row));
  });

  // 管理者のみ: サーバー更新
  fastify.patch<{
    Params: { id: string };
    Body: McpServerUpdateRequest;
    Reply: McpServerRecord | ApiError;
  }>('/mcp-servers/:id', { preHandler: guard }, async (request, reply) => {
    const { id } = request.params;
    const { display_name, type, url, headers, command, args, env } = request.body;

    const updates: Partial<InsertMcpServer> = {};

    if (display_name !== undefined) {
      if (typeof display_name !== 'string' || !display_name.trim()) {
        return reply.status(400).send({
          error: 'BadRequest',
          message: 'display_name must be a non-empty string',
          statusCode: 400,
        });
      }
      updates.displayName = display_name.trim();
    }

    if (type !== undefined) {
      if (!VALID_TYPES.includes(type)) {
        return reply.status(400).send({
          error: 'BadRequest',
          message: `type must be one of: ${VALID_TYPES.join(', ')}`,
          statusCode: 400,
        });
      }
      updates.type = type;
    }

    if (url !== undefined) updates.url = url?.trim() || null;
    if (headers !== undefined) updates.headers = headers ?? null;
    if (command !== undefined) updates.command = command?.trim() || null;
    if (args !== undefined) updates.args = args ?? null;
    if (env !== undefined) updates.env = env ?? null;

    if (Object.keys(updates).length === 0) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'No fields to update',
        statusCode: 400,
      });
    }

    const [row] = await fastify.db
      .update(mcpServers)
      .set(updates)
      .where(eq(mcpServers.id, id))
      .returning();

    if (!row) {
      return reply.status(404).send({
        error: 'NotFound',
        message: 'MCP server not found',
        statusCode: 404,
      });
    }

    return reply.send(toRecord(row));
  });

  // 管理者のみ: サーバー削除
  fastify.delete<{
    Params: { id: string };
    Reply: { success: true } | ApiError;
  }>('/mcp-servers/:id', { preHandler: guard }, async (request, reply) => {
    const { id } = request.params;

    const deleted = await fastify.db
      .delete(mcpServers)
      .where(eq(mcpServers.id, id))
      .returning({ id: mcpServers.id });

    if (deleted.length === 0) {
      return reply.status(404).send({
        error: 'NotFound',
        message: 'MCP server not found',
        statusCode: 404,
      });
    }

    return reply.send({ success: true });
  });
};

export default mcpServersRoute;
