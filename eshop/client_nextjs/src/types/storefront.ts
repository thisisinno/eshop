export type User = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  permissions: string[];
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  image_url: string | null;
  display_order: number;
  is_featured: boolean;
  parent_id: number | null;
};

export type StoreSummary = {
  id: number;
  business_name: string;
  slug: string;
  logo_url: string | null;
  cover_url: string | null;
  is_verified: boolean;
  is_featured: boolean;
  follower_count: number;
  product_count: number;
  is_following: boolean;
  region: string;
  district: string;
  location_summary: string;
};

export type ProductCard = {
  id: number;
  product_id: string;
  name: string;
  slug: string;
  short_description: string;
  price: string;
  compare_at_price: string | null;
  currency: string;
  delivery_fee: string;
  stock_quantity: number;
  minimum_order_quantity: number;
  unit: string;
  has_discount: boolean;
  discount_percent: string;
  views_count: number;
  sold_count: number;
  primary_media_url: string | null;
  media_preview: ProductCardMedia[];
  store: StoreSummary;
  category: Category | null;
  is_bookmarked: boolean;
  has_selectable_specifications: boolean;
  created_at: string;
};

export type ProductCardMedia = {
  id: number;
  media_type: "image" | "clip" | "poster";
  url: string | null;
  title: string;
  alt_text: string;
  is_primary: boolean;
  sort_order: number;
};

export type ProductMedia = {
  id: number;
  media_type: "image" | "clip" | "spin_frame" | "model_3d" | "poster";
  url: string | null;
  title: string;
  alt_text: string;
  caption: string;
  is_primary: boolean;
  sort_order: number;
  frame_index: number | null;
};

export type Viewer360 =
  | { enabled: boolean; ready: boolean; mode: "spin"; minimum_frame_count: number; frames: ProductMedia[] }
  | { enabled: boolean; ready: boolean; mode: "model"; model_url: string | null; poster_url: string | null };

export type ProductDetail = ProductCard & {
  description: string;
  specifications: Record<string, unknown>;
  view_360_enabled: boolean;
  view_360_mode: "spin" | "model";
  media: { gallery: ProductMedia[]; videos: ProductMedia[]; slides: ProductMedia[] };
  viewer_360: Viewer360;
  related_products: ProductCard[];
  specification_groups: ProductSpecificationGroup[];
};

export type ProductSpecificationOption = { id: number; value: string; price_adjustment: string; display_order: number };
export type ProductSpecificationGroup = { id: number; name: string; selection_mode: "single" | "multiple"; is_required: boolean; display_order: number; options: ProductSpecificationOption[] };
export type SelectedSpecification = { group_id: number; group_name: string; option_id: number; value: string; price_adjustment: string };

export type Shelf = { key: string; title: string; products: ProductCard[] };
export type HomeResponse = { following_store_count: number; shelves: Shelf[] };
export type StoreFollowResponse = {
  is_following: boolean;
  follower_count: number;
  created?: boolean;
};
export type Paginated<T> = { count: number; page: number; page_size: number; total_pages: number; next: string | null; previous: string | null; results: T[] };
export type StoreDetail = StoreSummary & { phone: string; email: string; address_description: string; categories: Category[] };

export type CartItem = { id: number; product: ProductCard; quantity: number; unit_price: string; selected_specifications: SelectedSpecification[]; line_total: string };
export type Cart = { id: number; items: CartItem[]; subtotal: string; delivery_fee: string; grand_total: string; total_quantity: number };

export type OrderPreviewItem = { product_name: string; product_media_url: string; quantity: number };
export type OrderListItem = {
  id: number;
  order_number: string;
  customer_full_name: string;
  customer_phone: string;
  customer_email: string;
  status: string;
  payment_status: string;
  source: string;
  total_amount: string;
  currency: string;
  items_count: number;
  total_quantity: number;
  preview_items: OrderPreviewItem[];
  chat: OrderChatSummary | null;
  created_at: string;
  updated_at: string;
};
export type OrderChatSummary = {
  id: number;
  status: "requested" | "open" | "closed";
  unread_count: number;
  latest_message_preview: string;
  latest_message_at: string | null;
  assigned_admin_name: string | null;
};
export type ChatMessage = {
  id: number; chat: number; sender: number; sender_name: string;
  sender_role: "customer" | "admin" | "system"; body: string;
  client_message_id: string; created_at: string;
};
export type OrderChat = {
  id: number; order: number; order_number: string; order_status: string;
  status: "requested" | "open" | "closed"; assigned_admin: number | null;
  assigned_admin_name: string | null; close_reason: string; last_message_at: string | null;
};
export type InvoiceItem = {
  id: number; product_id_snapshot: string; product_name_snapshot: string;
  product_sku_snapshot: string; product_media_url: string; trader_name_snapshot: string;
  selected_specifications_snapshot: SelectedSpecification[]; quantity: number;
  unit_price: string; line_discount: string; line_total: string; sort_order: number;
};
export type Invoice = {
  id: number; invoice_number: string; document_type: "proforma" | "order_invoice";
  status: "issued" | "paid" | "void"; currency: string; total_amount: string;
  order: number | null; order_number: string | null; issued_at: string; pdf_url: string;
  subtotal_amount?: string; discount_amount?: string; delivery_fee?: string;
  customer_name_snapshot?: string; customer_email_snapshot?: string;
  customer_phone_snapshot?: string; customer_address_snapshot?: string;
  company_name_snapshot?: string; items?: InvoiceItem[];
};
export type OrderDetailItem = {
  id: number;
  product: number | null;
  product_media_url: string;
  product_name_snapshot: string;
  trader_name_snapshot: string;
  quantity: number;
  unit_price: string;
  line_discount: string;
  line_total: string;
  selected_specifications_snapshot: SelectedSpecification[];
};
export type OrderStatusHistory = { id: number; from_status: string; to_status: string; note: string; changed_by_name: string | null; created_at: string };
export type OrderDetail = OrderListItem & {
  customer_country: string;
  customer_region: string;
  customer_district: string;
  customer_ward: string;
  customer_street: string;
  customer_address: string;
  delivery_note: string;
  subtotal_amount: string;
  discount_amount: string;
  delivery_fee: string;
  items: OrderDetailItem[];
  status_history: OrderStatusHistory[];
};
export type StorefrontNotification = {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  lifecycle_state: "pending" | "completed";
  is_read: boolean;
  read_at: string | null;
  order: Pick<OrderListItem, "id" | "order_number" | "status" | "payment_status" | "total_amount" | "currency" | "items_count" | "total_quantity"> | null;
  product: ProductCard | null;
  store: StoreSummary | null;
  activity: { id: number; action: string; product_name: string; trader_name: string; metadata: Record<string, unknown>; created_at: string } | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type BrandStatus = {
  id: number;
  media_url: string | null;
  media_type: "image" | "video";
  caption: string;
  display_duration_seconds: number;
  starts_at: string;
  expires_at: string;
  sort_order: number;
  updated_at: string;
};

export type SiteBranding = {
  site_name: string;
  logo_url: string | null;
  logo_alt_text: string;
  statuses: BrandStatus[];
  updated_at: string;
};
