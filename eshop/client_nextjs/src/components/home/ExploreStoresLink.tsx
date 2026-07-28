"use client";

import { Loader2, Store } from "lucide-react";
import Link from "next/link";
import { useRouteFeedback } from "@/hooks/useRouteFeedback";

export function ExploreStoresLink({ children }: { children: React.ReactNode }) {
  const feedback = useRouteFeedback("/stores");
  return (
    <Link
      href="/stores"
      onClick={feedback.onClick}
      aria-busy={feedback.loading || undefined}
      className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-white px-4 text-sm font-semibold text-[var(--color-text)] transition duration-180 hover:bg-[var(--color-primary-soft)] active:scale-[0.97] motion-reduce:transition-none"
    >
      {feedback.loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Store aria-hidden className="h-4 w-4" />}
      {children}
    </Link>
  );
}
