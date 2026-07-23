import { apiErrorResponse, requireToken } from "@/lib/api/route-utils";
import { djangoFetch } from "@/lib/api/django";
import type { OrderDetail } from "@/types/storefront";

export async function POST(request: Request) {
  const token = await requireToken();
  if (!token) return Response.json({ error: "Sign in required." }, { status: 401 });
  try {
    const data = await djangoFetch<OrderDetail>("/storefront/orders/", { method: "POST", body: await request.text() }, token);
    return Response.json(data, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
