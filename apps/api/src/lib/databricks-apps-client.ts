/**
 * Databricks Apps API クライアント
 *
 * Databricks Apps のステータス取得を行う最小限のクライアントです。
 * AuthProvider を使用して認証します。
 */

import type { DatabricksApp } from '@repo/types';
import type { AuthProvider } from './databricks-auth.js';

export class DatabricksApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'DatabricksApiError';
  }
}

export class DatabricksAppsClient {
  private readonly host: string;

  constructor(private readonly authProvider: AuthProvider) {
    this.host = authProvider.getEnvVars().DATABRICKS_HOST;
  }

  /**
   * 認証付きリクエストを送信し、404 以外のエラーを throw する
   */
  private async request(method: string, appName: string): Promise<Response> {
    const token = await this.authProvider.getToken();
    const url = new URL(`/api/2.0/apps/${encodeURIComponent(appName)}`, this.host);

    const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` } });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw new DatabricksApiError(
        response.status,
        `Databricks API error (${response.status}): ${errorText}`
      );
    }

    return response;
  }

  /**
   * Databricks App の情報を取得
   *
   * @param appName - アプリ名
   * @returns アプリ情報（見つからない場合は null）
   */
  async get(appName: string): Promise<DatabricksApp | null> {
    const response = await this.request('GET', appName);
    if (response.status === 404) return null;
    const data: unknown = await response.json();
    if (
      !data ||
      typeof data !== 'object' ||
      !('name' in data) ||
      typeof (data as Record<string, unknown>).name !== 'string'
    ) {
      throw new DatabricksApiError(
        502,
        "Invalid response from Databricks Apps API: missing 'name' field"
      );
    }
    return data as DatabricksApp;
  }

  /**
   * Databricks App を削除
   *
   * @param appName - アプリ名
   */
  async delete(appName: string): Promise<void> {
    await this.request('DELETE', appName);
  }
}
