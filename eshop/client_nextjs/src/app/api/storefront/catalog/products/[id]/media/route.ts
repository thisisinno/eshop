import { apiErrorResponse, requireToken } from "@/lib/api/route-utils";
import { djangoFetch } from "@/lib/api/django";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await requireToken();
  if (!token) return Response.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await params;
  try {
    const data = await djangoFetch(`/catalog/products/${id}/media/`, { method: "POST", body: await request.formData() }, token);
    return Response.json(data, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
