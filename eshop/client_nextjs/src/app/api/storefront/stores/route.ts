import { forwardDjango } from "@/lib/api/route-utils";
import type { StoreSummary } from "@/types/storefront";

const SUPPORTED_PARAMS = ["search"] as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams();
  for (const key of SUPPORTED_PARAMS) {
    const value = searchParams.get(key)?.trim();
    if (value) params.set(key, value);
  }
  const suffix = params.size ? `?${params.toString()}` : "";
  return forwardDjango<StoreSummary[]>(`/storefront/stores/${suffix}`, {}, { auth: "optional" });
}
