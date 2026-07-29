import { djangoFetch } from "@/lib/api/django";
import { apiErrorResponse, requireToken } from "@/lib/api/route-utils";

export async function GET() {
  const token = await requireToken();
  if (!token) return Response.json({ detail: "Sign in required." }, { status: 401 });
  try {
    return Response.json(await djangoFetch("/storefront/invoices/mine/", { method: "GET" }, token));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
