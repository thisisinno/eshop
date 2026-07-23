"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Facebook, Instagram, Mail, MoreHorizontal, Send, Share2, X } from "lucide-react";
import { toast } from "sonner";
import type { ProductDetail } from "@/types/storefront";

const money = (amount: string, currency: string) => `${currency} ${Number(amount).toLocaleString()}`;

function productUrl(productId: number) {
  if (typeof window === "undefined") return `/products/${productId}`;
  return `${window.location.origin}/products/${productId}`;
}

async function logShare(productId: number, channel: string) {
  try {
    await fetch(`/api/storefront/products/${productId}/share/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
    });
  } catch {
    // Telemetry must never block the share flow.
  }
}

export function ShareProductButton({ product, compact = false }: { product: ProductDetail; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = productUrl(product.id);
  const shareText = useMemo(() => `${product.name}\n${money(product.price, product.currency)}\n${url}`, [product.currency, product.name, product.price, url]);
  const nativePayload = { title: product.name, text: `${product.name} - ${money(product.price, product.currency)}`, url };

  async function nativeShare(channel = "native") {
    if (!navigator.share) {
      setOpen(true);
      return;
    }
    try {
      await navigator.share(nativePayload);
      void logShare(product.id, channel);
    } catch {
      return;
    }
  }

  async function copy(channel = "copy", message = "Link copied.") {
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
    toast.success(message);
    void logShare(product.id, channel);
  }

  const buttonClass = compact
    ? "relative grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border-strong)] bg-white transition hover:bg-[var(--color-primary-soft)] active:scale-[0.96]"
    : "relative grid h-12 w-12 place-items-center rounded-full border border-[var(--color-border-strong)] bg-white transition hover:bg-[var(--color-primary-soft)] active:scale-[0.96]";

  return (
    <>
      <button type="button" aria-label={`Share ${product.name}`} title={`Share ${product.name}`} onClick={() => void nativeShare()} onContextMenu={(event) => { event.preventDefault(); setOpen(true); }} className={buttonClass}>
        <Share2 aria-hidden className="h-5 w-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Share product">
          <button aria-label="Close share options" className="absolute inset-0 h-full w-full bg-black/20" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-[var(--color-border)] bg-white p-4 pb-[calc(16px+env(safe-area-inset-bottom))] md:left-1/2 md:right-auto md:top-1/2 md:h-fit md:w-[380px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black">Share</h2>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-[var(--color-primary-soft)]"><X aria-hidden className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <ShareOption label="WhatsApp" Icon={Send} onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer"); void logShare(product.id, "whatsapp"); }} />
              <ShareOption label="Facebook" Icon={Facebook} onClick={() => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer"); void logShare(product.id, "facebook"); }} />
              <ShareOption label="Instagram" Icon={Instagram} onClick={() => "share" in navigator ? void nativeShare("instagram") : void copy("instagram", "Link copied for Instagram.")} />
              <ShareOption label="Email" Icon={Mail} onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent(product.name)}&body=${encodeURIComponent(shareText)}`; void logShare(product.id, "email"); }} />
              <ShareOption label={copied ? "Copied" : "Copy link"} Icon={copied ? Check : Copy} onClick={() => void copy()} />
              <ShareOption label="More" Icon={MoreHorizontal} onClick={() => void nativeShare("native")} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ShareOption({ label, Icon, onClick }: { label: string; Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] text-sm font-semibold transition hover:bg-[var(--color-primary-soft)] active:scale-[0.98]">
      <Icon aria-hidden className="h-5 w-5" />
      <span>{label}</span>
    </button>
  );
}
