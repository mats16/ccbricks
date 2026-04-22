// =====================================================
// Admin Types
// =====================================================

export interface AdminUserInfo {
  id: string;
  email: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface AdminUserListResponse {
  users: AdminUserInfo[];
}

export interface UpdateUserRoleRequest {
  is_admin: boolean;
}

export type UserRole = 'admin' | 'member';

export interface AppSettingsResponse {
  default_new_user_role: UserRole;
  default_opus_model: string | null;
  default_sonnet_model: string | null;
  default_haiku_model: string | null;
  otel_table_name: string | null;
}

export interface UpdateAppSettingsRequest {
  default_new_user_role?: UserRole;
  default_opus_model?: string | null;
  default_sonnet_model?: string | null;
  default_haiku_model?: string | null;
  otel_table_name?: string | null;
}

export interface ServingEndpointsByTier {
  opus: string[];
  sonnet: string[];
  haiku: string[];
}
