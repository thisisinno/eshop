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
  stock_quantity: number;
  minimum_order_quantity: number;
  unit: string;
  has_discount: boolean;
  discount_percent: string;
  views_count: number;
  sold_count: number;
  primary_media_url: string | null;
  store: StoreSummary;
  category: Category | null;
  is_bookmarked: boolean;
  created_at: string;
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
  media: { gallery: ProductMedia[]; videos: ProductMedia[] };
  viewer_360: Viewer360;
  related_products: ProductCard[];
};

export type Shelf = { key: string; title: string; products: ProductCard[] };
export type HomeResponse = { shelves: Shelf[] };
export type Paginated<T> = { count: number; page: number; page_size: number; total_pages: number; next: string | null; previous: string | null; results: T[] };
export type StoreDetail = StoreSummary & { phone: string; email: string; address_description: string; categories: Category[] };

export type CartItem = { id: number; product: ProductCard; quantity: number; line_total: string };
export type Cart = { id: number; items: CartItem[]; subtotal: string; total_quantity: number };
