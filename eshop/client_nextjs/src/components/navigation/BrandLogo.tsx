"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import type { BrandStatus, SiteBranding, User } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";

const SEEN_KEY = "seen_brand_status_ids";

function readSeen() {
  if (typeof window === "undefined") return new Set<number>();
  try {
    return new Set<number>(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set<number>();
  }
}

function canManageStatuses(user: User | null) {
  return Boolean(user?.is_superuser || user?.permissions?.includes("api.add_brandstatus"));
}

export function BrandLogo({ branding, user, className = "" }: { branding: SiteBranding; user: User | null; className?: string }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<Set<number>>(() => readSeen());
  const statuses = useMemo(() => branding.statuses || [], [branding.statuses]);
  const hasStatuses = statuses.length > 0;
  const unseen = useMemo(() => statuses.some((status) => !seen.has(status.id)), [seen, statuses]);
  const logo = resolveMediaUrl(branding.logo_url);

  function openViewer() {
    if (!hasStatuses) return;
    setOpen(true);
  }
  const markSeen = useCallback((ids: number[]) => {
    setSeen((current) => {
      const next = new Set([...current, ...ids]);
      localStorage.setItem(SEEN_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const inner = (
    <span className={`brand-logo relative grid shrink-0 place-items-center rounded-full border bg-white transition duration-180 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(0,0,0,0.08)] active:scale-[0.96] motion-reduce:transition-none ${hasStatuses ? (unseen ? "brand-logo-status-unseen border-black" : "border-[var(--color-border-strong)] ring-2 ring-gray-300") : "border-[var(--color-border)]"} ${className}`}>
      <span className="relative grid h-full w-full place-items-center overflow-hidden rounded-full bg-white">
        {logo ? <Image src={logo} alt={branding.logo_alt_text || branding.site_name} fill sizes="48px" className="object-contain p-1" /> : <span className="px-2 text-sm font-black">{branding.site_name || "eShop"}</span>}
      </span>
    </span>
  );

  return (
    <>
      {hasStatuses ? <button type="button" aria-label={`View ${branding.site_name} status`} onClick={openViewer}>{inner}</button> : <Link aria-label={branding.site_name || "Home"} href="/">{inner}</Link>}
      {open ? <BrandStatusViewer branding={branding} statuses={statuses} user={user} onClose={() => setOpen(false)} onSeen={markSeen} /> : null}
    </>
  );
}

function BrandStatusViewer({ branding, statuses, user, onClose, onSeen }: { branding: SiteBranding; statuses: BrandStatus[]; user: User | null; onClose: () => void; onSeen: (ids: number[]) => void }) {
  const [index, setIndex] = useState(0);
  const current = statuses[index];
  const mediaUrl = resolveMediaUrl(current?.media_url);

  useEffect(() => {
    if (!current) return;
    onSeen([current.id]);
    if (current.media_type === "video") return;
    const timer = window.setTimeout(() => setIndex((value) => value + 1 < statuses.length ? value + 1 : value), 5000);
    return () => window.clearTimeout(timer);
  }, [current, onSeen, statuses.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setIndex((value) => Math.min(statuses.length - 1, value + 1));
      if (event.key === "ArrowLeft") setIndex((value) => Math.max(0, value - 1));
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, statuses.length]);

  if (!current) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black text-white" role="dialog" aria-modal="true" aria-label={`${branding.site_name} status`}>
      <div className="absolute inset-x-0 top-0 z-10 p-4">
        <div className="flex gap-1">
          {statuses.map((status, itemIndex) => <span key={status.id} className={`h-1 flex-1 rounded-full ${itemIndex < index ? "bg-white" : itemIndex === index ? "bg-white/80" : "bg-white/35"}`} />)}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-bold">{branding.site_name}</span>
          <div className="flex items-center gap-2">
            {canManageStatuses(user) ? <Link href={process.env.NEXT_PUBLIC_ADMIN_URL || "/"} aria-label="Add logo status" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"><Plus aria-hidden className="h-5 w-5" /></Link> : null}
            <button type="button" aria-label="Close status" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X aria-hidden className="h-5 w-5" /></button>
          </div>
        </div>
      </div>
      <button type="button" aria-label="Previous status" className="absolute left-0 top-0 z-[1] h-full w-1/3" onClick={() => setIndex((value) => Math.max(0, value - 1))} />
      <button type="button" aria-label="Next status" className="absolute right-0 top-0 z-[1] h-full w-1/3" onClick={() => setIndex((value) => Math.min(statuses.length - 1, value + 1))} />
      <div className="grid h-full place-items-center px-3 py-20">
        {current.media_type === "video" ? <video src={mediaUrl || undefined} className="max-h-full max-w-full object-contain" controls autoPlay onEnded={() => setIndex((value) => Math.min(statuses.length - 1, value + 1))} /> : mediaUrl ? <Image src={mediaUrl} alt={current.caption || branding.site_name} width={1200} height={1600} className="max-h-full w-auto max-w-full object-contain" /> : null}
      </div>
      {current.caption ? <p className="absolute inset-x-0 bottom-6 z-10 px-6 text-center text-sm font-semibold">{current.caption}</p> : null}
    </div>
  );
}
