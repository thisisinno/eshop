export type OrderStatus = "draft" | "requested" | "confirmed" | "processing" | "ready" | "shipped" | "delivered" | "cancelled" | "rejected";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "refunded";
export type OrderSource = "admin" | "web_pwa" | "mobile_pwa" | "api";

export interface OrderListItem {
  id: number; order_number: string; customer_full_name: string; customer_phone: string; customer_email: string;
  status: OrderStatus; payment_status: PaymentStatus; source: OrderSource; total_amount: string; currency: string;
  items_count: number; created_at: string; updated_at: string;
}

export interface OrderItem {
  id: number; order: number; product: number | null; product_name: string | null; product_media_url: string;
  product_id_snapshot: string; product_name_snapshot: string; product_sku_snapshot: string;
  trader: number | null; trader_name_snapshot: string; branch: number | null; branch_name_snapshot: string;
  quantity: number; unit_price: string; line_discount: string; line_total: string; note: string;
  created_at: string; updated_at: string;
}

export interface OrderStatusHistory {
  id: number; from_status: string; to_status: string; note: string; changed_by: number | null;
  changed_by_name: string | null; created_at: string;
}

export interface Order extends OrderListItem {
  customer_user: number | null; customer_username: string; customer_country: string; customer_region: string;
  customer_district: string; customer_ward: string; customer_street: string; customer_address: string;
  delivery_note: string; admin_note: string; subtotal_amount: string; discount_amount: string; delivery_fee: string;
  requested_ip_address: string | null; requested_user_agent: string; requested_device: string; requested_browser: string; requested_os: string;
  created_by: number | null; updated_by: number | null; confirmed_by: number | null;
  created_by_name: string | null; updated_by_name: string | null; confirmed_by_name: string | null;
  confirmed_at: string | null; delivered_at: string | null; cancelled_at: string | null;
  items: OrderItem[]; status_history: OrderStatusHistory[];
}

export interface OrderItemPayload {
  product?: number | null; product_name_snapshot?: string; quantity: number; unit_price: string | number;
  line_discount?: string | number; note?: string;
}

export interface OrderWritePayload {
  customer_full_name: string; customer_phone: string; customer_email?: string; customer_country?: string;
  customer_region?: string; customer_district?: string; customer_ward?: string; customer_street?: string;
  customer_address?: string; delivery_note?: string; admin_note?: string; source?: OrderSource;
  status?: OrderStatus; payment_status?: PaymentStatus; currency?: string; delivery_fee?: string | number;
  items?: OrderItemPayload[];
}
