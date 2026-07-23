import { apiErrorResponse } from "@/lib/api/route-utils";
import { djangoFetch, getServerToken } from "@/lib/api/django";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const data = await djangoFetch(`/storefront/products/${id}/share/`, { method: "POST", body: await request.text() }, await getServerToken());
    return Response.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
