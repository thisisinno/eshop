import { forwardDjango } from "@/lib/api/route-utils";
import type { Paginated, StorefrontNotification } from "@/types/storefront";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state");
  const page = searchParams.get("page");
  const audience = searchParams.get("audience");
  const params = new URLSearchParams();
  if (state) params.set("state", state);
  if (page) params.set("page", page);
  if (audience) params.set("audience", audience);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return forwardDjango<Paginated<StorefrontNotification>>(`/storefront/notifications/${suffix}`);
}
