"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, ChevronRight, Loader2, Store } from "lucide-react";
import { VerifiedBusinessBadge } from "@/components/store/VerifiedBusinessBadge";
import { useRouteFeedback } from "@/hooks/useRouteFeedback";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import type { StoreSummary } from "@/types/storefront";
import { StoreFollowButton } from "./FollowButton";

function pluralize(count: number, singular: string) {
  return `${count.toLocaleString()} ${singular}${count === 1 ? "" : "s"}`;
}

export function StoreListTile({
  store,
  onFollowChange,
}: {
  store: StoreSummary;
  onFollowChange: (storeId: number, following: boolean, followerCount: number) => void;
}) {
  const href = `/stores/${store.slug}`;
  const feedback = useRouteFeedback(href);
  const logo = resolveMediaUrl(store.logo_url);

  return (
    <article className="group grid min-h-20 grid-cols-[minmax(0,1fr)_auto_32px] items-center gap-1 bg-white px-2 py-2 transition-[background-color,opacity] duration-180 hover:bg-[var(--color-primary-soft)] sm:gap-2 sm:px-4 motion-reduce:transition-none">
      <Link
        href={href}
        onClick={feedback.onClick}
        aria-label={`Open ${store.business_name} store`}
        className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)] items-center gap-2 rounded-lg py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black sm:grid-cols-[52px_minmax(0,1fr)] sm:gap-3"
      >
        <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--color-primary-soft)] sm:h-12 sm:w-12">
          {logo ? <Image src={logo} alt="" fill sizes="48px" className="object-cover" /> : <Store aria-hidden className="h-5 w-5" />}
        </span>
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate text-sm font-black text-[var(--color-text)] sm:text-[15px]">{store.business_name}</span>
            {store.is_verified ? <VerifiedBusinessBadge className="h-4 w-4 shrink-0" /> : null}
          </span>
          <span className="mt-0.5 block truncate text-xs text-[var(--color-text-secondary)] sm:text-sm">{store.location_summary || "Location not listed"}</span>
          <span className="mt-0.5 block truncate text-[11px] font-medium text-[var(--color-text-secondary)] sm:text-xs">
            {pluralize(store.product_count ?? 0, "product")} · {pluralize(store.follower_count ?? 0, "follower")}
          </span>
        </span>
      </Link>
      <div className="grid min-h-11 place-items-center">
        <StoreFollowButton
          slug={store.slug}
          storeName={store.business_name}
          initialFollowing={store.is_following}
          initialFollowerCount={store.follower_count}
          size="compact"
          onChange={(following, followerCount) => onFollowChange(store.id, following, followerCount)}
        />
      </div>
      <Link
        href={href}
        onClick={feedback.onClick}
        aria-label={`Open ${store.business_name}`}
        aria-busy={feedback.loading || undefined}
        className="grid h-11 w-8 place-items-center rounded-full text-[var(--color-text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
      >
        {feedback.loading ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" /> : feedback.complete ? <Check className="h-5 w-5" strokeWidth={2.8} /> : <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />}
      </Link>
    </article>
  );
}
