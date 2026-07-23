import { forwardDjango } from "@/lib/api/route-utils";
import type { SiteBranding } from "@/types/storefront";

export async function GET() {
  return forwardDjango<SiteBranding>("/storefront/branding/", { method: "GET" }, { auth: "optional" });
}
