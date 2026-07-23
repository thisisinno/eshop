import { apiErrorResponse, requireToken } from "@/lib/api/route-utils";
import { djangoFetch } from "@/lib/api/django";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await requireToken();
  if (!token) return Response.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await params;
  try {
    const data = await djangoFetch(`/storefront/products/${id}/bookmark/`, { method: "POST" }, token);
    return Response.json(data, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await requireToken();
  if (!token) return Response.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await params;
  try {
    await djangoFetch(`/storefront/products/${id}/bookmark/`, { method: "DELETE" }, token);
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
