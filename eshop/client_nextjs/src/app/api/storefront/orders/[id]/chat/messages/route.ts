import { djangoFetch } from "@/lib/api/django";
import { apiErrorResponse, requireToken } from "@/lib/api/route-utils";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await requireToken(); if (!token) return Response.json({ detail: "Sign in required." }, { status: 401 });
  const { id } = await params; const query = new URL(request.url).search;
  try { return Response.json(await djangoFetch(`/storefront/orders/mine/${id}/chat/messages/${query}`, {}, token)); }
  catch (error) { return apiErrorResponse(error); }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await requireToken(); if (!token) return Response.json({ detail: "Sign in required." }, { status: 401 });
  const { id } = await params;
  try { return Response.json(await djangoFetch(`/storefront/orders/mine/${id}/chat/messages/`, { method: "POST", body: await request.text() }, token)); }
  catch (error) { return apiErrorResponse(error); }
}
