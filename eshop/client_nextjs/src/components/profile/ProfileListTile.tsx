"use client";

import Link from "next/link";
import { Check, ChevronRight, Loader2, type LucideIcon } from "lucide-react";
import { useRouteFeedback } from "@/hooks/useRouteFeedback";

export function ProfileListTile({ href, title, subtitle, Icon }: { href: string; title: string; subtitle?: string; Icon: LucideIcon }) {
  const feedback = useRouteFeedback(href);
  const RouteIcon = feedback.loading ? Loader2 : feedback.complete ? Check : ChevronRight;
  return <Link href={href} onClick={feedback.onClick} className="flex min-h-16 items-center gap-3 px-4 transition hover:bg-[var(--color-primary-soft)] active:scale-[.995]">
    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-primary-soft)]"><Icon aria-hidden className="h-5 w-5" /></span>
    <span className="min-w-0 flex-1"><span className="block font-bold">{title}</span>{subtitle ? <span className="block truncate text-xs text-[var(--color-text-secondary)]">{subtitle}</span> : null}</span>
    <RouteIcon aria-hidden className={`h-5 w-5 ${feedback.loading ? "animate-spin" : ""}`} />
  </Link>;
}
