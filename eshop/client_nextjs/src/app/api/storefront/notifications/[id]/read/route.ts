import { apiErrorResponse, requireToken } from "@/lib/api/route-utils";
import { djangoFetch } from "@/lib/api/django";
import type { StorefrontNotification } from "@/types/storefront";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await requireToken();
  if (!token) return Response.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await params;
  try {
    const data = await djangoFetch<StorefrontNotification>(`/storefront/notifications/${id}/read/`, { method: "PATCH" }, token);
    return Response.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
