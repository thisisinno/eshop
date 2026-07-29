"use client";

import Link from "next/link";
import { Check, Download, Eye, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouteFeedback } from "@/hooks/useRouteFeedback";
import type { Invoice } from "@/types/storefront";

export function InvoiceListTile({ invoice }: { invoice: Invoice }) {
  const details = useRouteFeedback(`/invoices/${invoice.id}`);
  const [downloading, setDownloading] = useState<"idle" | "loading" | "complete">("idle");
  async function download() {
    setDownloading("loading");
    const response = await fetch(`/api/storefront/invoices/${invoice.id}/pdf/`);
    if (!response.ok) { setDownloading("idle"); toast.error("Could not download PDF."); return; }
    const blob = await response.blob(); const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `SmartWear-${invoice.invoice_number}.pdf`; anchor.click(); URL.revokeObjectURL(url);
    setDownloading("complete"); window.setTimeout(() => setDownloading("idle"), 2000);
  }
  const DownloadIcon = downloading === "loading" ? Loader2 : downloading === "complete" ? Check : Download;
  return <article className="flex items-center gap-3 p-4">
    <div className="min-w-0 flex-1"><h2 className="font-black">{invoice.invoice_number}</h2><p className="mt-1 text-xs text-[var(--color-text-secondary)]">{invoice.document_type === "proforma" ? "Pro forma" : "Order invoice"} · {new Date(invoice.issued_at).toLocaleDateString()}</p><p className="mt-1 text-sm font-bold">{invoice.currency} {Number(invoice.total_amount).toLocaleString()} · <span className="capitalize">{invoice.status}</span></p>{invoice.order_number ? <p className="mt-1 text-xs">{invoice.order_number}</p> : null}</div>
    <button onClick={download} aria-label={`Download ${invoice.invoice_number}`} className="grid h-11 w-11 place-items-center rounded-full border"><DownloadIcon className={`h-5 w-5 ${downloading === "loading" ? "animate-spin" : ""}`} /></button>
    <Link href={`/invoices/${invoice.id}`} onClick={details.onClick} aria-label={`View ${invoice.invoice_number}`} className="grid h-11 w-11 place-items-center rounded-full border">{details.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : details.complete ? <Check className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</Link>
  </article>;
}
