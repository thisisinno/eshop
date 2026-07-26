import { forwardDjango } from "@/lib/api/route-utils";

export async function PATCH(_: Request, { params }: { params: Promise<{ id: string; mediaId: string }> }) {
  const { id, mediaId } = await params;
  return forwardDjango(`/catalog/products/${id}/media/${mediaId}/primary/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" });
}
