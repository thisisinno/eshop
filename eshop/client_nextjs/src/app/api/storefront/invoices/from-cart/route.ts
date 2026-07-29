import { djangoFetch } from "@/lib/api/django";
import { apiErrorResponse, requireToken } from "@/lib/api/route-utils";
import type { Invoice } from "@/types/storefront";

export async function POST() {
  const token = await requireToken();
  if (!token) return Response.json({ detail: "Sign in required." }, { status: 401 });
  try {
    return Response.json(await djangoFetch<Invoice>(
      "/storefront/invoices/from-cart/", { method: "POST" }, token
    ));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
