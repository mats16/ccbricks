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
  new_user_role_default: UserRole;
}

export interface UpdateAppSettingsRequest {
  new_user_role_default: UserRole;
}
