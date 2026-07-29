import { djangoFetch } from "@/lib/api/django";
import { apiErrorResponse, requireToken } from "@/lib/api/route-utils";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await requireToken(); if (!token) return Response.json({ detail: "Sign in required." }, { status: 401 });
  const { id } = await params;
  try { await djangoFetch(`/storefront/orders/mine/${id}/chat/read/`, { method: "POST", body: await request.text() }, token); return new Response(null, { status: 204 }); }
  catch (error) { return apiErrorResponse(error); }
}
