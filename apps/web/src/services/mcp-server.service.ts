import type {
  McpServerCreateRequest,
  McpServerUpdateRequest,
  McpServerRecord,
  McpServerPublicListResponse,
} from '@repo/types';
import { apiClient } from './api-client';

export const mcpServerService = {
  async list(): Promise<McpServerPublicListResponse> {
    return apiClient<McpServerPublicListResponse>('/api/mcp-servers');
  },

  async get(id: string): Promise<McpServerRecord> {
    return apiClient<McpServerRecord>(`/api/mcp-servers/${encodeURIComponent(id)}`);
  },

  async create(req: McpServerCreateRequest): Promise<McpServerRecord> {
    return apiClient<McpServerRecord>('/api/mcp-servers', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async update(id: string, req: McpServerUpdateRequest): Promise<McpServerRecord> {
    return apiClient<McpServerRecord>(`/api/mcp-servers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(req),
    });
  },

  async remove(id: string): Promise<void> {
    await apiClient<{ success: true }>(`/api/mcp-servers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};
