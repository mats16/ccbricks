/**
 * Databricks Apps API クライアント
 *
 * Databricks Apps のステータス取得を行う最小限のクライアントです。
 * AuthProvider を使用して認証します。
 */

import type { DatabricksApp } from '@repo/types';
import type { AuthProvider } from './databricks-auth.js';

export class DatabricksAppsClient {
  private readonly host: string;

  constructor(private readonly authProvider: AuthProvider) {
    this.host = authProvider.getEnvVars().DATABRICKS_HOST;
  }

  /**
   * Databricks App の情報を取得
   *
   * @param appName - アプリ名
   * @returns アプリ情報（見つからない場合は null）
   */
  async get(appName: string): Promise<DatabricksApp | null> {
    const token = await this.authProvider.getToken();
    const url = new URL(`/api/2.0/apps/${encodeURIComponent(appName)}`, this.host);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Databricks API error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<DatabricksApp>;
  }
}
