import { forwardDjango } from "@/lib/api/route-utils";
import type { Paginated, ProductCard } from "@/types/storefront";

export async function GET() {
  return forwardDjango<Paginated<ProductCard>>("/storefront/bookmarks/");
}
