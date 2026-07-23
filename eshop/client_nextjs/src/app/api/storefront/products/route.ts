import { forwardDjango } from "@/lib/api/route-utils";
import type { Paginated, ProductCard } from "@/types/storefront";

const SUPPORTED_PARAMS = ["search", "category", "store", "min_price", "max_price", "in_stock", "discounted", "sort", "page"] as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams();
  for (const key of SUPPORTED_PARAMS) {
    const value = searchParams.get(key);
    if (value) params.set(key, value);
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return forwardDjango<Paginated<ProductCard>>(`/storefront/products/${suffix}`, {}, { auth: "optional" });
}
