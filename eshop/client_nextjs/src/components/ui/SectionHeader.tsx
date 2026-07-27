"use client";

import Link from "next/link";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useRouteFeedback } from "@/hooks/useRouteFeedback";

export function SectionHeader({ title, href }: { title: string; href?: string }) {
  const feedback = useRouteFeedback(href ?? "");
  const icon = feedback.loading
    ? <Loader2 aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" />
    : feedback.complete
      ? <Check aria-hidden className="h-4 w-4" strokeWidth={2.8} />
      : <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />;

  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-black tracking-normal md:text-xl">{title}</h2>
      {href ? <Link href={href} aria-label={`View all ${title}`} title={`View all ${title}`} aria-busy={feedback.loading || undefined} onClick={feedback.onClick} className="section-more-action group grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-primary-soft)]">{icon}</Link> : null}
    </div>
  );
}
