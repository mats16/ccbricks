import type { GenieSpaceListResponse } from '@repo/types';
import { apiClient } from './api-client';

export const genieService = {
  async listGenieSpaces(pageToken?: string): Promise<GenieSpaceListResponse> {
    const query = new URLSearchParams({ page_size: '100' });
    if (pageToken) query.set('page_token', pageToken);
    return apiClient<GenieSpaceListResponse>(`/api/databricks/genie/spaces?${query}`);
  },
};
