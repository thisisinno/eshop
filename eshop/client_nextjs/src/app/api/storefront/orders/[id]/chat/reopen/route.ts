import { djangoFetch } from "@/lib/api/django";
import { apiErrorResponse, requireToken } from "@/lib/api/route-utils";
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await requireToken(); if (!token) return Response.json({ detail: "Sign in required." }, { status: 401 });
  const { id } = await params;
  try { return Response.json(await djangoFetch(`/storefront/orders/mine/${id}/chat/reopen/`, { method: "POST" }, token)); }
  catch (error) { return apiErrorResponse(error); }
}
