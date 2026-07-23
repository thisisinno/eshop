import { forwardDjango } from "@/lib/api/route-utils";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state");
  return forwardDjango<{ updated: number }>(`/storefront/notifications/read-all/${state ? `?state=${encodeURIComponent(state)}` : ""}`, { method: "POST" });
}
