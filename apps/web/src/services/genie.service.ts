import type { GenieSpaceListResponse } from '@repo/types';
import { apiClient } from './api-client';

export const genieService = {
  async listGenieSpaces(): Promise<GenieSpaceListResponse> {
    return apiClient<GenieSpaceListResponse>('/api/databricks/genie/spaces');
  },
};
