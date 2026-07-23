import { forwardDjango } from "@/lib/api/route-utils";

export async function GET(request: Request) {
  const audience = new URL(request.url).searchParams.get("audience");
  const suffix = audience ? `?audience=${encodeURIComponent(audience)}` : "";
  return forwardDjango<{ count: number }>(`/storefront/notifications/unread-count/${suffix}`);
}
