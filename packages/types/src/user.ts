// =====================================================
// User Types
// =====================================================

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
}

export interface UserResponse {
  user: UserInfo;
  databricks_host: string;
}
