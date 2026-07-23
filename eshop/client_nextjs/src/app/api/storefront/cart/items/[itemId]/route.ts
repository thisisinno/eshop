import { apiErrorResponse, requireToken } from "@/lib/api/route-utils";
import { djangoFetch } from "@/lib/api/django";
import type { Cart } from "@/types/storefront";

export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const token = await requireToken();
  if (!token) return Response.json({ error: "Sign in required." }, { status: 401 });
  const { itemId } = await params;
  try {
    const data = await djangoFetch<Cart>(`/storefront/cart/items/${itemId}/`, { method: "PATCH", body: await request.text() }, token);
    return Response.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const token = await requireToken();
  if (!token) return Response.json({ error: "Sign in required." }, { status: 401 });
  const { itemId } = await params;
  try {
    await djangoFetch(`/storefront/cart/items/${itemId}/`, { method: "DELETE" }, token);
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
