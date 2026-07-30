"use client";

import Link from "next/link";
import { Check, Download, Eye, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouteFeedback } from "@/hooks/useRouteFeedback";
import type { Invoice } from "@/types/storefront";
import { downloadResponse } from "@/lib/download";
import { ListTile, listTileActionClass } from "@/components/ui/ListTile";

export function InvoiceListTile({ invoice }: { invoice: Invoice }) {
  const details = useRouteFeedback(`/invoices/${invoice.id}`);
  const [downloading, setDownloading] = useState<"idle" | "loading" | "complete">("idle");
  async function download() {
    setDownloading("loading");
    try {
      await downloadResponse(`/api/storefront/invoices/${invoice.id}/pdf/`, `SmartWear-${invoice.invoice_number}.pdf`);
      setDownloading("complete"); window.setTimeout(() => setDownloading("idle"), 2000);
    } catch (error) {
      setDownloading("idle");
      toast.error(error instanceof Error ? error.message : "Could not download PDF.");
    }
  }
  const DownloadIcon = downloading === "loading" ? Loader2 : downloading === "complete" ? Check : Download;
  return <ListTile className="flex items-center gap-2 px-3 py-2 sm:px-4">
    <div className="min-w-0 flex-1"><h2 className="font-black">{invoice.invoice_number}</h2><p className="mt-1 text-xs text-[var(--color-text-secondary)]">{invoice.document_type === "proforma" ? "Pro forma" : "Order invoice"} · {new Date(invoice.issued_at).toLocaleDateString()}</p><p className="mt-1 text-sm font-bold">{invoice.currency} {Number(invoice.total_amount).toLocaleString()} · <span className="capitalize">{invoice.status}</span></p>{invoice.order_number ? <p className="mt-1 text-xs">{invoice.order_number}</p> : null}</div>
    <button onClick={download} disabled={downloading === "loading"} aria-label={`Download ${invoice.invoice_number}`} className={listTileActionClass}><DownloadIcon className={`h-5 w-5 ${downloading === "loading" ? "animate-spin motion-reduce:animate-none" : ""}`} /></button>
    <Link href={`/invoices/${invoice.id}`} onClick={details.onClick} aria-label={`View ${invoice.invoice_number}`} className={listTileActionClass}>{details.loading ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" /> : details.complete ? <Check className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</Link>
  </ListTile>;
}
