export interface Permission { id: number; name: string; codename: string; app_label: string; model: string; content_type: number; }
export interface Role { id: number; name: string; permissions: number[]; permission_details: Permission[]; user_count: number; }
export interface AdminUser { id: number; username: string; email: string; first_name: string; last_name: string; is_active: boolean; is_staff: boolean; is_superuser: boolean; groups: number[]; group_details: Role[]; user_permissions: number[]; permission_details: Permission[]; date_joined: string; last_login: string | null; }
