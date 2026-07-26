import { forwardDjango } from "@/lib/api/route-utils";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardDjango(`/catalog/products/${id}/`);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardDjango(`/catalog/products/${id}/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: await request.text() });
}
