import { forwardDjango } from "@/lib/api/route-utils";
import type { Category, Paginated, ProductCard } from "@/types/storefront";

const SUPPORTED_PARAMS = ["sort", "in_stock", "discounted", "min_price", "max_price", "page"] as const;

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const query = new URLSearchParams();
  for (const key of SUPPORTED_PARAMS) {
    const value = searchParams.get(key);
    if (value) query.set(key, value);
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return forwardDjango<Paginated<ProductCard> & { category: Category }>(`/storefront/categories/${slug}/${suffix}`, {}, { auth: "optional" });
}
