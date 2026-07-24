import { forwardDjango } from "@/lib/api/route-utils";
import type { Paginated, ProductCard, StoreDetail } from "@/types/storefront";

const SUPPORTED_PARAMS = ["search", "category", "sort", "page"] as const;

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const query = new URLSearchParams();
  for (const key of SUPPORTED_PARAMS) {
    const value = searchParams.get(key);
    if (value) query.set(key, value);
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return forwardDjango<Paginated<ProductCard> & { store: StoreDetail }>(`/storefront/stores/${slug}/${suffix}`, {}, { auth: "optional" });
}
