"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, ChevronRight, Loader2, Store } from "lucide-react";
import { VerifiedBusinessBadge } from "@/components/store/VerifiedBusinessBadge";
import { useRouteFeedback } from "@/hooks/useRouteFeedback";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import type { StoreSummary } from "@/types/storefront";

function pluralize(count: number, singular: string) {
  return `${count.toLocaleString()} ${singular}${count === 1 ? "" : "s"}`;
}

export function StoreListTile({ store }: { store: StoreSummary }) {
  const href = `/stores/${store.slug}`;
  const feedback = useRouteFeedback(href);
  const logo = resolveMediaUrl(store.logo_url);

  return (
    <Link
      href={href}
      onClick={feedback.onClick}
      aria-label={`Open ${store.business_name} store`}
      aria-busy={feedback.loading || undefined}
      className="group grid min-h-20 grid-cols-[52px_minmax(0,1fr)_24px] items-center gap-3 bg-white px-4 py-3 transition-[background-color,transform,opacity] duration-150 hover:bg-[var(--color-primary-soft)] active:scale-[0.995] active:bg-[var(--color-primary-soft)] focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-black motion-reduce:transition-none"
    >
      <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--color-primary-soft)]">
        {logo ? <Image src={logo} alt="" fill sizes="48px" className="object-cover" /> : <Store aria-hidden className="h-5 w-5" />}
      </span>
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[15px] font-black text-[var(--color-text)]">{store.business_name}</span>
          {store.is_verified ? <VerifiedBusinessBadge className="h-4 w-4 shrink-0" /> : null}
        </span>
        <span className="mt-0.5 block truncate text-sm text-[var(--color-text-secondary)]">{store.location_summary || "Location not listed"}</span>
        <span className="mt-0.5 block truncate text-xs font-medium text-[var(--color-text-secondary)]">
          {pluralize(store.product_count ?? 0, "product")} · {pluralize(store.follower_count ?? 0, "follower")}
          {store.is_featured ? " · Featured" : store.is_following ? " · Following" : ""}
        </span>
      </span>
      <span className="grid h-8 w-6 place-items-center text-[var(--color-text-secondary)]" aria-hidden>
        {feedback.loading ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" /> : feedback.complete ? <Check className="h-5 w-5" strokeWidth={2.8} /> : <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />}
      </span>
    </Link>
  );
}
