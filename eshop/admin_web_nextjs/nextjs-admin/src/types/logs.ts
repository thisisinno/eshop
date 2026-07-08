export interface UserActivityLog {
  id: number; username_snapshot: string; session_key: string; ip_address: string | null; device_type: string;
  browser: string; os: string; action: string; product: number | null; product_name?: string | null;
  rating_value: number | null; search_query: string; metadata: Record<string, unknown>; created_at: string;
}

export interface AdminActivityLog {
  id: number; actor_username: string; ip_address: string | null; device_type: string; browser: string; os: string;
  module: string; action: string; object_type: string; object_id: string; object_repr: string;
  status_code: number | null; metadata: Record<string, unknown>; created_at: string;
}

export interface SystemRequestLog {
  id: number; username_snapshot: string; ip_address: string | null; device_type: string; browser: string; os: string;
  method: string; path: string; status_code: number | null; duration_ms: number | null; is_error: boolean;
  error_message: string; metadata: Record<string, unknown>; created_at: string;
}
