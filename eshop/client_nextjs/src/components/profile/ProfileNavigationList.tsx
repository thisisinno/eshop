"use client";

import { Bookmark, Check, ChevronRight, Download, Loader2, Package, ReceiptText, Settings, Store } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { downloadResponse } from "@/lib/download";
import { useRouteFeedback } from "@/hooks/useRouteFeedback";
import { ListTile, listTileActionClass, listTileMainClass } from "@/components/ui/ListTile";

const rows = [
  { href: "/invoices", title: "Invoices", subtitle: "View and download documents", Icon: ReceiptText },
  { href: "/saved", title: "Bookmarks", subtitle: "Products saved for later", Icon: Bookmark },
  { href: "/stores?scope=following", title: "Followed stores", subtitle: "Stores you follow", Icon: Store },
  { href: "/profile", title: "Settings", subtitle: "Account preferences", Icon: Settings },
];

function ProfileRow({ href, title, subtitle, Icon }: (typeof rows)[number]) {
  const feedback = useRouteFeedback(href);
  const RouteIcon = feedback.loading ? Loader2 : feedback.complete ? Check : ChevronRight;
  return (
    <ListTile className="grid grid-cols-[minmax(0,1fr)_44px] items-center gap-1 px-2 py-2 sm:px-4">
      <Link href={href} onClick={feedback.onClick} className={`${listTileMainClass} grid min-h-14 grid-cols-[44px_minmax(0,1fr)] items-center gap-3 py-1`} aria-label={`Open ${title}`}>
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-primary-soft)]"><Icon aria-hidden className="h-5 w-5" /></span>
        <span className="min-w-0"><span className="block truncate font-bold">{title}</span><span className="block truncate text-xs text-[var(--color-text-secondary)]">{subtitle}</span></span>
      </Link>
      <Link href={href} onClick={feedback.onClick} aria-label={`Open ${title}`} aria-busy={feedback.loading || undefined} className="grid h-11 w-11 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-black">
        <RouteIcon aria-hidden className={`h-5 w-5 ${feedback.loading ? "animate-spin motion-reduce:animate-none" : ""}`} />
      </Link>
    </ListTile>
  );
}

function OrdersRow() {
  const href = "/orders";
  const feedback = useRouteFeedback(href);
  const [exportState, setExportState] = useState<"idle" | "loading" | "complete">("idle");
  const ExportIcon = exportState === "loading" ? Loader2 : exportState === "complete" ? Check : Download;
  const RouteIcon = feedback.loading ? Loader2 : feedback.complete ? Check : ChevronRight;

  async function exportOrders() {
    if (exportState === "loading") return;
    setExportState("loading");
    try {
      await downloadResponse("/api/storefront/orders/export/pdf/", "SmartWear-order-history.pdf");
      setExportState("complete");
      toast.success("Order history downloaded.");
      window.setTimeout(() => setExportState("idle"), 2000);
    } catch (error) {
      setExportState("idle");
      toast.error(error instanceof Error ? error.message : "Could not export order history.");
    }
  }

  return (
    <ListTile className="grid grid-cols-[minmax(0,1fr)_auto_44px] items-center gap-1 px-2 py-2 sm:gap-2 sm:px-4">
      <Link href={href} onClick={feedback.onClick} className={`${listTileMainClass} grid min-h-14 grid-cols-[44px_minmax(0,1fr)] items-center gap-3 py-1`} aria-label="Open Orders">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-primary-soft)]"><Package aria-hidden className="h-5 w-5" /></span>
        <span className="min-w-0"><span className="block truncate font-bold">Orders</span><span className="block truncate text-xs text-[var(--color-text-secondary)]">Track orders and contact support</span></span>
      </Link>
      <button type="button" onClick={exportOrders} disabled={exportState === "loading"} aria-label="Export order history as PDF" aria-busy={exportState === "loading" || undefined} className={listTileActionClass}>
        <ExportIcon aria-hidden className={`h-4 w-4 ${exportState === "loading" ? "animate-spin motion-reduce:animate-none" : ""}`} /><span className="hidden min-[360px]:inline">Export</span>
      </button>
      <Link href={href} onClick={feedback.onClick} aria-label="Open Orders" className="grid h-11 w-11 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-black">
        <RouteIcon aria-hidden className={`h-5 w-5 ${feedback.loading ? "animate-spin motion-reduce:animate-none" : ""}`} />
      </Link>
    </ListTile>
  );
}

export function ProfileNavigationList() {
  return <div className="divide-y divide-[var(--color-border)] border-b border-[var(--color-border)]"><OrdersRow />{rows.map((row) => <ProfileRow key={row.title} {...row} />)}</div>;
}
