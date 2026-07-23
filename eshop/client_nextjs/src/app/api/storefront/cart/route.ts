import { forwardDjango } from "@/lib/api/route-utils";
import type { Cart } from "@/types/storefront";

export async function GET() {
  return forwardDjango<Cart>("/storefront/cart/");
}
