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
}

// =====================================================
// MCP Config Types (標準 MCP 設定形式)
// =====================================================

export interface McpToolPermission {
  name: string;
  permission_policy: string;
}

export type McpServerType = 'http';

export interface McpServerEntry {
  type: McpServerType;
  url: string;
  headers?: Record<string, string>;
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
