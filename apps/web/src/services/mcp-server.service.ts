import type {
  McpServerCreateRequest,
  McpServerUpdateRequest,
  McpServerRecord,
  McpServerListResponse,
} from '@repo/types';
import { apiClient } from './api-client';

export const mcpServerService = {
  async list(): Promise<McpServerListResponse> {
    return apiClient<McpServerListResponse>('/api/user/mcp-servers');
  },

  async create(req: McpServerCreateRequest): Promise<McpServerRecord> {
    return apiClient<McpServerRecord>('/api/user/mcp-servers', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async update(id: string, req: McpServerUpdateRequest): Promise<McpServerRecord> {
    return apiClient<McpServerRecord>(`/api/user/mcp-servers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(req),
    });
  },

  async remove(id: string): Promise<void> {
    await apiClient<{ success: true }>(`/api/user/mcp-servers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};
