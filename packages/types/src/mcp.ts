import type { SessionOutcome } from './session.js';

// =====================================================
// Genie Space Types (Databricks API)
// =====================================================

export interface GenieSpace {
  space_id: string;
  title: string;
  description?: string;
}

export interface GenieSpaceListResponse {
  spaces: GenieSpace[];
  next_page_token?: string;
}

// =====================================================
// MCP Config Types (標準 MCP 設定形式)
// =====================================================

export interface McpToolPermission {
  name: string;
  permission_policy: string;
}

export type McpServerType = 'http' | 'sse' | 'stdio';

export interface McpServerEntry {
  type: McpServerType;
  url?: string;
  headers?: Record<string, string>;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  tools?: McpToolPermission[];
}

export interface McpConfig {
  mcpServers: Record<string, McpServerEntry>;
}

// =====================================================
// MCP Tool Types for ctx server
// =====================================================

/**
 * mcp__ctx__get_outcomes のレスポンス
 */
export interface GetOutcomesResponse {
  outcomes: SessionOutcome[];
}

/**
 * mcp__ctx__update_outcome のリクエスト
 */
export interface UpdateOutcomeRequest {
  /** 更新対象の outcome のインデックス */
  index: number;
  /** 新しい outcome データ */
  outcome: SessionOutcome;
}

/**
 * mcp__ctx__update_outcome のレスポンス
 */
export interface UpdateOutcomeResponse {
  success: boolean;
  outcomes: SessionOutcome[];
}

// =====================================================
// Custom MCP Server Types (ユーザーごとの MCP サーバー設定)
// =====================================================

/** Databricks managed MCP サーバーの種別 */
export type ManagedMcpType =
  | 'databricks_sql'
  | 'databricks_genie'
  | 'databricks_vector_search'
  | 'unity_ai_gateway';

export interface McpServerRecord {
  id: string;
  name: string;
  type: McpServerType;
  managed_type?: ManagedMcpType;
  url?: string;
  headers?: Record<string, string>;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  /** サーバーが無効化されているかどうか */
  is_disabled: boolean;
  created_at: string;
  updated_at: string;
}

export type McpServerCreateRequest = Omit<
  McpServerRecord,
  'is_disabled' | 'created_at' | 'updated_at'
>;

export type McpServerUpdateRequest = Partial<
  Omit<McpServerRecord, 'id' | 'managed_type' | 'created_at' | 'updated_at'>
>;

export interface McpServerListResponse {
  mcp_servers: McpServerRecord[];
}

// =====================================================
// External MCP Server Types (Unity AI Gateway)
// =====================================================

/** フロントエンド向け外部 MCP サーバー情報 */
export interface ExternalMcpServer {
  id: string;
  name: string;
  url: string;
  owner: string;
  options?: Record<string, string>;
}

export interface ExternalMcpServerListResponse {
  mcp_servers: ExternalMcpServer[];
}
