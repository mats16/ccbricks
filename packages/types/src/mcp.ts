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
// Custom MCP Server Types (管理者が登録するカスタムサーバー)
// =====================================================

/** Databricks managed MCP サーバーの種別 */
export type ManagedMcpType = 'databricks_sql' | 'databricks_genie' | 'databricks_vector_search';

export interface McpServerRecord {
  id: string;
  display_name: string;
  type: McpServerType;
  managed_type?: ManagedMcpType;
  url?: string;
  headers?: Record<string, string>;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  /** ユーザーごとの有効/無効設定（未設定時は undefined） */
  enabled?: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type McpServerCreateRequest = Omit<
  McpServerRecord,
  'enabled' | 'created_by' | 'created_at' | 'updated_at'
>;

export type McpServerUpdateRequest = Partial<
  Omit<McpServerRecord, 'id' | 'enabled' | 'created_by' | 'created_at' | 'updated_at'>
>;

export interface McpServerListResponse {
  mcp_servers: McpServerRecord[];
}

// =====================================================
// User MCP Settings Types (ユーザーごとの MCP 有効/無効設定)
// =====================================================

export interface UserSettingsMcpUpdateRequest {
  enabled: boolean;
}

export interface UserSettingsMcpUpdateResponse {
  server_id: string;
  enabled: boolean;
}
