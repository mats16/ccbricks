import type { ExternalMcpServerListResponse } from '@repo/types';
import { apiClient } from './api-client';

export const externalMcpServerService = {
  async list(options?: { refresh?: boolean }): Promise<ExternalMcpServerListResponse> {
    const params = options?.refresh ? '?refresh=true' : '';
    return apiClient<ExternalMcpServerListResponse>(`/api/mcp-servers${params}`);
  },
};
