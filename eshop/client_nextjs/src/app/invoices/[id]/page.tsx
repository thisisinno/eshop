import Image from "next/image";
import Link from "next/link";
import { serverGet } from "@/lib/api/django";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import type { Invoice } from "@/types/storefront";

export default async function InvoiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const invoice = await serverGet<Invoice>(`/storefront/invoices/mine/${id}/`);
  return <section><header className="border-b p-4"><p className="text-xs font-bold uppercase">{invoice.document_type === "proforma" ? "Pro forma invoice" : "Invoice"}</p><h1 className="text-2xl font-black">{invoice.invoice_number}</h1><p className="mt-1 text-sm capitalize">{invoice.status} · {new Date(invoice.issued_at).toLocaleDateString()}</p></header><div className="space-y-6 p-4">
    <div className="divide-y rounded-2xl border">{invoice.items?.map((item) => { const image = resolveMediaUrl(item.product_media_url); return <article key={item.id} className="flex gap-3 p-3">{image ? <div className="relative h-16 w-16 overflow-hidden rounded-lg"><Image src={image} alt={item.product_name_snapshot} fill sizes="64px" className="object-cover" /></div> : null}<div className="min-w-0 flex-1"><h2 className="font-bold">{item.product_name_snapshot}</h2><p className="text-xs text-[var(--color-text-secondary)]">{item.quantity} × {invoice.currency} {Number(item.unit_price).toLocaleString()}</p><p className="mt-1 font-bold">{invoice.currency} {Number(item.line_total).toLocaleString()}</p></div></article>; })}</div>
    <div className="ml-auto max-w-sm space-y-2 rounded-2xl border p-4"><p className="flex justify-between"><span>Subtotal</span><b>{invoice.currency} {Number(invoice.subtotal_amount).toLocaleString()}</b></p><p className="flex justify-between"><span>Delivery</span><b>{invoice.currency} {Number(invoice.delivery_fee).toLocaleString()}</b></p><p className="flex justify-between border-t pt-2 text-lg"><span>Total</span><b>{invoice.currency} {Number(invoice.total_amount).toLocaleString()}</b></p></div>
    <div className="flex justify-end gap-2">{invoice.order ? <Link href={`/orders/${invoice.order}`} className="rounded-full border px-4 py-2 font-bold">View order</Link> : null}<a href={`/api/storefront/invoices/${invoice.id}/pdf/`} className="rounded-full bg-black px-4 py-2 font-bold text-white">Download PDF</a></div>
  </div></section>;
}
