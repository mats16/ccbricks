import type { SessionOutcome } from './session.js';

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
