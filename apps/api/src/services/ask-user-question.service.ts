import type { WsAskUserQuestionRequest } from '@repo/types';
import { broadcastToSession } from './session.service.js';

interface PendingQuestion {
  resolve: (answers: Record<string, string | string[]>) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

/** AskUserQuestion の回答待ち管理（tool_use_id → PendingQuestion） */
const pendingQuestions = new Map<string, PendingQuestion>();

/** タイムアウト（10 分） */
const ASK_USER_QUESTION_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * AskUserQuestion をサスペンドし、ユーザーの回答を待つ。
 *
 * 1. WebSocket で全クライアントに質問リクエストを broadcast
 * 2. Promise を返し、resolve されるまでブロック
 *
 * @returns ユーザーの回答（header → 選択ラベル のマッピング）
 */
export function waitForUserAnswer(
  sessionId: string,
  toolUseId: string,
  input: Record<string, unknown>,
  signal?: AbortSignal
): Promise<Record<string, string | string[]>> {
  return new Promise<Record<string, string | string[]>>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeoutId);
      pendingQuestions.delete(toolUseId);
      if (signal) signal.removeEventListener('abort', onAbort);
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('AskUserQuestion timed out waiting for user response'));
    }, ASK_USER_QUESTION_TIMEOUT_MS);

    const onAbort = () => {
      cleanup();
      reject(new Error('AskUserQuestion aborted'));
    };
    if (signal) {
      if (signal.aborted) {
        cleanup();
        reject(new Error('AskUserQuestion aborted'));
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    pendingQuestions.set(toolUseId, {
      resolve: answers => {
        cleanup();
        resolve(answers);
      },
      reject: err => {
        cleanup();
        reject(err);
      },
      timeoutId,
    });

    // リアルタイム接続に質問リクエストを broadcast
    const request: WsAskUserQuestionRequest = {
      type: 'ask_user_question',
      tool_use_id: toolUseId,
      input,
    };
    broadcastToSession(sessionId, request);
  });
}

/**
 * ユーザーからの回答を受信して、対応する Promise を resolve する。
 *
 * @returns true: 回答が受理された, false: 対応する質問が見つからない
 */
export function resolveUserAnswer(
  toolUseId: string,
  answers: Record<string, string | string[]>
): boolean {
  const pending = pendingQuestions.get(toolUseId);
  if (!pending) return false;

  pending.resolve(answers);
  return true;
}
