import { apiErrorResponse } from "@/lib/api/route-utils";
import { djangoFetch } from "@/lib/api/django";
import type { StoreFollowResponse } from "@/types/storefront";

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const data = await djangoFetch<StoreFollowResponse>(`/storefront/stores/${slug}/follow/`, { method: "POST" });
    return Response.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const data = await djangoFetch<StoreFollowResponse>(`/storefront/stores/${slug}/follow/`, { method: "DELETE" });
    return Response.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
