import { apiErrorResponse, assertAllowedDjangoPath, requireToken } from "@/lib/api/route-utils";
import { djangoFetch } from "@/lib/api/django";
import type { ProductDetail } from "@/types/storefront";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const path = assertAllowedDjangoPath(`/storefront/products/${id}/`);
    const data = await djangoFetch<ProductDetail>(path, { method: "GET" }, await requireToken());
    return Response.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
