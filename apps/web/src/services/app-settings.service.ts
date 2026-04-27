import type { AppPublicSettingsResponse } from '@repo/types';
import { apiClient } from './api-client';

export const appSettingsService = {
  getPublicSettings: () => apiClient<AppPublicSettingsResponse>('/api/app-settings'),
};
