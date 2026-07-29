import { djangoFetch } from "@/lib/api/django";
import { apiErrorResponse, requireToken } from "@/lib/api/route-utils";

export async function POST(request: Request) {
  const token = await requireToken();
  if (!token) return Response.json({ detail: "Sign in required." }, { status: 401 });
  try {
    const data = await djangoFetch("/realtime/tickets/", {
      method: "POST", body: await request.text(),
    }, token);
    return Response.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
