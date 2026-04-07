export const MCP_DBSQL_ID = 'dbsql';
export const MCP_DBSQL_URL_PATH = '/api/2.0/mcp/sql';
export const MCP_GENIE_URL_PREFIX = '/api/2.0/mcp/genie';

export function buildDbsqlMcpUrl(databricksHost: string | null | undefined): string {
  return databricksHost ? `https://${databricksHost}${MCP_DBSQL_URL_PATH}` : '';
}

export function buildGenieMcpUrl(databricksHost: string | null | undefined, spaceId: string): string {
  return databricksHost ? `https://${databricksHost}${MCP_GENIE_URL_PREFIX}/${spaceId}` : '';
}

export const STORAGE_KEY_ENABLED_MCP_SERVERS = 'enabled-mcp-servers';
