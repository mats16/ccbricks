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

export interface AppSettingsResponse {
  default_new_user_is_admin: boolean;
}

export interface UpdateAppSettingsRequest {
  default_new_user_is_admin: boolean;
}
