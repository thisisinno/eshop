import { djangoRawFetch } from "@/lib/api/django";
import { requireToken } from "@/lib/api/route-utils";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await requireToken();
  if (!token) return Response.json({ detail: "Sign in required." }, { status: 401 });
  const { id } = await params;
  const upstream = await djangoRawFetch(`/storefront/invoices/mine/${id}/pdf/`, {}, token);
  if (!upstream.ok) {
    const detail = await upstream.text();
    return Response.json({ detail: detail || "Could not download invoice." }, { status: upstream.status });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "application/pdf",
      "Content-Disposition": upstream.headers.get("Content-Disposition") || `attachment; filename="SmartWear-invoice-${id}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
