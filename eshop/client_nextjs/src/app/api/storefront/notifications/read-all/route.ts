import { forwardDjango } from "@/lib/api/route-utils";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state");
  const audience = searchParams.get("audience");
  const params = new URLSearchParams();
  if (state) params.set("state", state);
  if (audience) params.set("audience", audience);
  return forwardDjango<{ updated: number }>(`/storefront/notifications/read-all/${params.toString() ? `?${params.toString()}` : ""}`, { method: "POST" });
}
