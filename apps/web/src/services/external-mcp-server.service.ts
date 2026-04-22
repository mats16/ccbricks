import type { ExternalMcpServerListResponse } from '@repo/types';
import { apiClient } from './api-client';

export const externalMcpServerService = {
  async list(): Promise<ExternalMcpServerListResponse> {
    return apiClient<ExternalMcpServerListResponse>('/api/mcp-servers');
  },
};
