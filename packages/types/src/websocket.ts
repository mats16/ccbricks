/**
 * WebSocket 関連の型定義
 */

import type { SDKMessage, SDKUserMessage, SDKAuthStatusMessage } from './session.js';

// SDKMessage, SDKUserMessage, SDKAuthStatusMessage を re-export（WebSocket でも使用）
export type { SDKMessage, SDKUserMessage, SDKAuthStatusMessage };

/**
 * WebSocket 接続時のサーバーからの初期メッセージ
 */
export interface WsConnectedMessage {
  type: 'connected';
  session_id: string;
  last_event_id: string | null;
}

/**
 * WebSocket エラーメッセージ
 */
export interface WsErrorMessage {
  type: 'error';
  code: string;
  message: string;
}

/**
 * Abort リクエスト（クライアント -> サーバー）
 */
export interface WsAbortRequest {
  subtype: 'abort';
}

/**
 * AskUserQuestion 回答リクエスト（クライアント -> サーバー）
 */
export interface WsAskUserQuestionAnswerRequest {
  subtype: 'ask_user_question_answer';
  tool_use_id: string;
  /** header → 選択された label (single) または label[] (multi) のマッピング */
  answers: Record<string, string | string[]>;
}

/**
 * Control リクエスト（クライアント -> サーバー）
 */
export interface WsControlRequest {
  type: 'control_request';
  request_id: string;
  request: WsAbortRequest | WsAskUserQuestionAnswerRequest;
}

/**
 * Control 成功レスポンス
 */
export interface WsControlSuccessResponse {
  subtype: 'success';
  request_id: string;
}

/**
 * Control エラーレスポンス
 */
export interface WsControlErrorResponse {
  subtype: 'error';
  request_id: string;
  error: string;
}

/**
 * Control レスポンス（サーバー -> クライアント）
 */
export interface WsControlResponse {
  type: 'control_response';
  response: WsControlSuccessResponse | WsControlErrorResponse;
}

/**
 * AskUserQuestion リクエスト（サーバー -> クライアント）
 * canUseTool コールバックで AskUserQuestion を検知した際に送信
 */
export interface WsAskUserQuestionRequest {
  type: 'ask_user_question';
  tool_use_id: string;
  input: Record<string, unknown>;
}

/**
 * WebSocket サーバー -> クライアントメッセージ
 */
export type WsServerMessage =
  | WsConnectedMessage
  | SDKMessage
  | SDKAuthStatusMessage
  | WsErrorMessage
  | WsControlResponse
  | WsAskUserQuestionRequest;

/**
 * WebSocket KeepAlive メッセージ（クライアント -> サーバー）
 */
export interface WsKeepAliveMessage {
  type: 'keep_alive';
}

/**
 * WebSocket クライアント -> サーバーメッセージ
 */
export type WsClientMessage = WsKeepAliveMessage | SDKUserMessage | WsControlRequest;
