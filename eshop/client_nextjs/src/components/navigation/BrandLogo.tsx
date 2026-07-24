"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Volume2, VolumeX, X } from "lucide-react";
import type { BrandStatus, SiteBranding, User } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";

const SEEN_KEY = "seen_brand_status_ids";
const VIEWER_KEY = "brand_status_viewer_id";

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

function getViewerId() {
  if (typeof window === "undefined") return "";
  const current = localStorage.getItem(VIEWER_KEY);
  if (current) return current;
  const next = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(VIEWER_KEY, next);
  return next;
}

export function BrandLogo({ branding, user, className = "" }: { branding: SiteBranding; user: User | null; className?: string }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<Set<number>>(() => new Set());
  const [seenStateReady, setSeenStateReady] = useState(false);
  const statuses = useMemo(() => branding.statuses || [], [branding.statuses]);
  const hasStatuses = statuses.length > 0;
  const unseen = useMemo(() => seenStateReady && statuses.some((status) => !seen.has(status.id)), [seen, seenStateReady, statuses]);
  const logo = resolveMediaUrl(branding.logo_url);

  useEffect(() => {
    window.queueMicrotask(() => {
      setSeen(readSeen());
      setSeenStateReady(true);
    });
  }, []);

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
    <span className={`brand-logo relative grid shrink-0 place-items-center rounded-full border bg-white transition duration-180 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(0,0,0,0.08)] active:scale-[0.96] motion-reduce:transition-none ${hasStatuses ? (!seenStateReady ? "border-[var(--color-border-strong)]" : unseen ? "brand-logo-status-unseen border-black" : "border-[var(--color-border-strong)] ring-2 ring-gray-300") : "border-[var(--color-border)]"} ${className}`}>
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
  const [intro, setIntro] = useState(true);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const reportedRef = useRef(new Set<number>());
  const progressRef = useRef(0);
  const current = statuses[index];
  const mediaUrl = resolveMediaUrl(current?.media_url);
  const durationMs = Math.max(1, current?.display_duration_seconds || 15) * 1000;

  const resetPlayback = useCallback(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setIntro(!reduceMotion);
    setProgress(0);
    progressRef.current = 0;
  }, []);

  const next = useCallback(() => {
    setIndex((value) => {
      if (value + 1 >= statuses.length) {
        window.setTimeout(onClose, 180);
        return value;
      }
      resetPlayback();
      return value + 1;
    });
  }, [onClose, resetPlayback, statuses.length]);

  const previous = useCallback(() => setIndex((value) => {
    const nextIndex = Math.max(0, value - 1);
    if (nextIndex !== value) resetPlayback();
    return nextIndex;
  }), [resetPlayback]);

  useEffect(() => {
    if (!current || !intro) return;
    const timer = window.setTimeout(() => setIntro(false), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 620);
    return () => window.clearTimeout(timer);
  }, [current, intro]);

  useEffect(() => {
    if (!current || intro) return;
    onSeen([current.id]);
    if (!reportedRef.current.has(current.id)) {
      reportedRef.current.add(current.id);
      void fetch(`/api/storefront/statuses/${current.id}/view/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonymous_viewer_id: getViewerId() }),
      }).catch(() => undefined);
    }
  }, [current, intro, onSeen]);

  useEffect(() => {
    if (!current || intro || paused) return;
    const started = performance.now() - progressRef.current * durationMs;
    let frame = 0;
    function tick(now: number) {
      const nextProgress = Math.min(1, (now - started) / durationMs);
      progressRef.current = nextProgress;
      setProgress(nextProgress);
      if (nextProgress >= 1) {
        next();
        return;
      }
      frame = window.requestAnimationFrame(tick);
    }
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [current, durationMs, intro, next, paused]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [next, onClose, previous]);

  useEffect(() => {
    function onVisibilityChange() {
      setPaused(document.hidden);
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  if (!current) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-2 text-white backdrop-blur-sm md:p-6" role="dialog" aria-modal="true" aria-label={`${branding.site_name} status`}>
      <div className={`relative h-[calc(100dvh-16px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-[460px] overflow-hidden rounded-[28px] bg-black shadow-[0_24px_80px_rgba(0,0,0,0.35)] transition duration-500 motion-reduce:transition-none md:h-[min(820px,calc(100dvh-48px))] ${intro ? "scale-[0.96] opacity-90" : "scale-100 opacity-100"}`}>
        {intro ? (
          <div className="absolute inset-0 z-30 grid place-items-center bg-black">
            <div className="grid place-items-center gap-4">
              <span className="grid h-24 w-24 animate-pulse place-items-center rounded-full border-4 border-white/70 bg-white/10 motion-reduce:animate-none">
                {resolveMediaUrl(branding.logo_url) ? <Image src={resolveMediaUrl(branding.logo_url)!} alt="" width={72} height={72} className="h-18 w-18 rounded-full object-contain" /> : <span className="text-lg font-black">{branding.site_name.slice(0, 2)}</span>}
              </span>
              <span className="text-sm font-bold">{branding.site_name}</span>
            </div>
          </div>
        ) : null}
        <div className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/65 to-transparent p-4 pt-[calc(16px+env(safe-area-inset-top))]">
          <div className="flex gap-1.5">
            {statuses.map((status, itemIndex) => {
              const fill = itemIndex < index ? 1 : itemIndex === index ? progress : 0;
              return <span key={status.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25"><span className="block h-full rounded-full bg-white" style={{ width: `${fill * 100}%` }} /></span>;
            })}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="truncate font-bold">{branding.site_name}</span>
            <div className="flex items-center gap-2">
              {current.media_type === "video" ? <button type="button" aria-label={muted ? "Turn sound on" : "Mute video"} onClick={() => setMuted((value) => !value)} className="grid h-9 w-9 place-items-center rounded-full bg-white/12 hover:bg-white/20">{muted ? <VolumeX aria-hidden className="h-4 w-4" /> : <Volume2 aria-hidden className="h-4 w-4" />}</button> : null}
              {canManageStatuses(user) ? <Link href={process.env.NEXT_PUBLIC_ADMIN_URL || "/"} aria-label="Add logo status" className="grid h-9 w-9 place-items-center rounded-full bg-white/12 hover:bg-white/20"><Plus aria-hidden className="h-4 w-4" /></Link> : null}
              <button type="button" aria-label="Close status" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/12 hover:bg-white/20"><X aria-hidden className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
        <button type="button" aria-label="Previous status" className="absolute left-0 top-0 z-10 h-full w-1/3" onClick={previous} onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} />
        <button type="button" aria-label="Next status" className="absolute right-0 top-0 z-10 h-full w-1/3" onClick={next} onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} />
        <div className="grid h-full place-items-center bg-black">
          {current.media_type === "video" ? (
            <video src={mediaUrl || undefined} className="h-full w-full object-contain" autoPlay playsInline muted={muted} controls={false} onEnded={next} />
          ) : mediaUrl ? (
            <Image src={mediaUrl} alt={current.caption || branding.site_name} width={1200} height={1600} priority className="max-h-full w-auto max-w-full object-contain" />
          ) : null}
        </div>
        {current.caption ? <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/70 to-transparent px-5 pb-[calc(22px+env(safe-area-inset-bottom))] pt-20"><p className="text-center text-sm font-semibold leading-6">{current.caption}</p></div> : null}
      </div>
    </div>
  );
}
