import { djangoRawFetch } from "@/lib/api/django";
import { requireToken } from "@/lib/api/route-utils";

export async function GET() {
  const token = await requireToken();
  if (!token) return Response.json({ detail: "Sign in required." }, { status: 401 });
  const upstream = await djangoRawFetch("/storefront/orders/mine/export/pdf/", {}, token);
  if (!upstream.ok) {
    const payload = await upstream.json().catch(() => null) as { detail?: string } | null;
    return Response.json({ detail: payload?.detail || "Could not export order history." }, { status: upstream.status });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": upstream.headers.get("Content-Disposition") || 'attachment; filename="SmartWear-order-history.pdf"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
