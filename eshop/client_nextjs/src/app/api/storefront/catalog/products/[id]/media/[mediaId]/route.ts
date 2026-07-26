import { apiErrorResponse, requireToken } from "@/lib/api/route-utils";
import { djangoFetch } from "@/lib/api/django";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; mediaId: string }> }) {
  const token = await requireToken();
  if (!token) return Response.json({ error: "Sign in required." }, { status: 401 });
  const { id, mediaId } = await params;
  try {
    const contentType = request.headers.get("content-type") || "";
    const body = contentType.includes("multipart/form-data") ? await request.formData() : await request.text();
    const data = await djangoFetch(`/catalog/products/${id}/media/${mediaId}/`, { method: "PATCH", body, ...(typeof body === "string" ? { headers: { "Content-Type": "application/json" } } : {}) }, token);
    return Response.json(data);
  } catch (error) { return apiErrorResponse(error); }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; mediaId: string }> }) {
  const token = await requireToken();
  if (!token) return Response.json({ error: "Sign in required." }, { status: 401 });
  const { id, mediaId } = await params;
  try {
    await djangoFetch(`/catalog/products/${id}/media/${mediaId}/`, { method: "DELETE" }, token);
    return new Response(null, { status: 204 });
  } catch (error) { return apiErrorResponse(error); }
}
