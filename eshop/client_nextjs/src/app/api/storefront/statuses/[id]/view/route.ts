import { djangoFetch, getServerToken } from "@/lib/api/django";
import { apiErrorResponse } from "@/lib/api/route-utils";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const token = await getServerToken();
    const body = await request.text();
    const data = await djangoFetch(`/storefront/statuses/${id}/view/`, { method: "POST", body }, token);
    return Response.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
