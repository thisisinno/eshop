import { forwardDjango } from "@/lib/api/route-utils";
import type { Cart } from "@/types/storefront";

export async function POST(request: Request) {
  return forwardDjango<Cart>("/storefront/cart/items/", { method: "POST", body: await request.text() });
}
