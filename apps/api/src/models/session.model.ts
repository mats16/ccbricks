// apps/api/src/models/session.model.ts
/**
 * @fileoverview セッション関連のドメインモデル
 *
 * ## 設計意図
 *
 * ### なぜ SessionId クラスを UUIDv7 で実装したか
 *
 * 1. **UUIDv7 の活用**: UUIDv7 は時系列ソートが可能でインデックス効率が良い。
 *
 * 2. **型安全性**: `SessionId` 型により、他の文字列 ID と型レベルで区別可能。
 *
 * 3. **API と DB の統一**: API リクエスト/レスポンスと DB の両方で
 *    同じ UUID 形式を使用し、変換が不要。
 *
 * ### ID 形式
 *
 * | 用途 | 形式 | 例 |
 * |------|------|-----|
 * | API リクエスト/レスポンス | UUIDv7 | 0188a5eb-4b84-7095-bae8-084200ae0295 |
 * | ファイルシステム（cwd） | UUIDv7 | /home/user/0188a5eb-4b84-... |
 * | データベース | UUIDv7 | 0188a5eb-4b84-7095-bae8-084200ae0295 |
 * | WebSocket ルーム ID | UUIDv7 | 0188a5eb-4b84-7095-bae8-084200ae0295 |
 *
 * ### 使用例
 *
 * ```typescript
 * import { SessionId } from './models/session.model.js';
 *
 * // 新規セッション作成時
 * const sessionId = new SessionId();
 * await db.insert(sessions).values({ id: sessionId.toUUID() });
 * return { id: sessionId.toString() }; // API レスポンス
 *
 * // API から受け取った UUID を処理
 * const sessionId = SessionId.fromString(request.params.session_id);
 * await db.select().from(sessions).where(eq(sessions.id, sessionId.toUUID()));
 * ```
 */

import { uuidv7 } from 'uuidv7';

/** UUIDv7 形式の正規表現（version=7, variant=10xx） */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * セッション ID クラス（UUIDv7 ベース）
 *
 * 主要メソッド:
 * - toString(): UUID 文字列（例: "0188a5eb-4b84-7095-..."）
 * - toUUID(): UUID 文字列（toString() と同一）
 *
 * ファクトリメソッド:
 * - SessionId.fromString(uuid) - UUID 文字列から SessionId を作成
 */
export class SessionId {
  private readonly uuid: string;

  /** 新しい SessionId を生成（UUIDv7 ベース） */
  constructor() {
    this.uuid = uuidv7();
  }

  /** UUID 文字列の内部ラッパー */
  private static wrap(uuid: string): SessionId {
    const instance = Object.create(SessionId.prototype) as SessionId;
    // readonly プロパティを強制的に設定
    Object.defineProperty(instance, 'uuid', { value: uuid, writable: false });
    return instance;
  }

  /** UUID 文字列から SessionId を作成（バリデーション付き） */
  static fromString(str: string): SessionId {
    if (!UUID_REGEX.test(str)) {
      throw new Error(`Invalid session ID format: ${str}`);
    }
    return SessionId.wrap(str);
  }

  /** UUID 文字列から SessionId を作成（fromString のエイリアス） */
  static fromUUID(uuid: string): SessionId {
    return SessionId.fromString(uuid);
  }

  /** UUID 文字列を返す */
  toString(): string {
    return this.uuid;
  }

  /** UUID 文字列を返す（toString と同一） */
  toUUID(): string {
    return this.uuid;
  }
}
