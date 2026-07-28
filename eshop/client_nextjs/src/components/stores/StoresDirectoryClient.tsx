"use client";

import { Search, Store, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useScrollDirectionVisibility } from "@/hooks/useScrollDirectionVisibility";
import type { StoreSummary } from "@/types/storefront";
import { StoreListTile } from "./StoreListTile";

type Scope = "all" | "following";

export function StoresDirectoryClient({
  initialStores,
  initialQuery,
  initialScope,
}: {
  initialStores: StoreSummary[];
  initialQuery: string;
  initialScope: Scope;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [scope, setScope] = useState<Scope>(initialScope);
  const [stores, setStores] = useState(initialStores);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const initialRender = useRef(true);
  const requestId = useRef(0);
  const { visible, setVisible } = useScrollDirectionVisibility({ paused: focused });
  const displayedStores = useMemo(
    () => scope === "following" ? stores.filter((store) => store.is_following) : stores,
    [scope, stores],
  );

  useEffect(() => {
    if (focused) setVisible(true);
  }, [focused, setVisible]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    const urlParams = new URLSearchParams();
    if (normalizedQuery) urlParams.set("q", normalizedQuery);
    if (scope === "following") urlParams.set("scope", "following");
    window.history.replaceState(null, "", `/stores${urlParams.size ? `?${urlParams.toString()}` : ""}`);

    if (initialRender.current && normalizedQuery === initialQuery.trim()) {
      initialRender.current = false;
      return;
    }

    const id = ++requestId.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (normalizedQuery) params.set("search", normalizedQuery);
      try {
        const response = await fetch(`/api/storefront/stores${params.size ? `?${params.toString()}` : ""}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Store search failed");
        const nextStores = await response.json() as StoreSummary[];
        if (requestId.current === id) setStores(nextStores);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          // Preserve the last useful directory on transient failures.
        }
      } finally {
        if (requestId.current === id) setLoading(false);
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [initialQuery, query, scope]);

  function selectScope(nextScope: Scope) {
    setScope(nextScope);
    setVisible(true);
  }

  function handleFollowChange(storeId: number, isFollowing: boolean, followerCount: number) {
    setStores((current) => current.map((store) => store.id === storeId
      ? { ...store, is_following: isFollowing, follower_count: followerCount }
      : store));
  }

  const emptyTitle = query
    ? "No stores found"
    : scope === "following"
      ? "You are not following any stores yet"
      : "No stores available yet";
  const emptyDescription = query
    ? "Try another store name or location."
    : scope === "following"
      ? "Browse stores and follow the ones you like."
      : "Approved SmartWear stores will appear here.";

  return (
    <section>
      <div className={`sticky top-[58px] z-20 border-b border-[var(--color-border)] bg-white/95 backdrop-blur transition-transform duration-180 ease-out md:top-0 motion-reduce:transition-none ${visible ? "translate-y-0" : "-translate-y-full"}`}>
        <div className="px-4 pb-3 pt-4">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="text-2xl font-black md:text-3xl">Stores</h1>
            <p className="text-xs font-semibold text-[var(--color-text-secondary)]" aria-live="polite">
              {loading ? "Searching..." : `${displayedStores.length} ${displayedStores.length === 1 ? "store" : "stores"}`}
            </p>
          </div>
          <label className="relative mt-3 block">
            <span className="sr-only">Search stores by name or location</span>
            <Search aria-hidden className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search by store or location"
              className="h-11 w-full rounded-full border border-[var(--color-border-strong)] bg-white pl-10 pr-11 text-sm text-[var(--color-text)] focus:border-black focus:outline-none"
            />
            {query ? <button type="button" aria-label="Clear store search" onClick={() => setQuery("")} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"><X aria-hidden className="h-4 w-4" /></button> : null}
          </label>
          <div className="mt-3 flex items-center justify-between" role="tablist" aria-label="Store scope">
            {(["all", "following"] as const).map((value) => {
              const active = scope === value;
              return <button key={value} type="button" role="tab" aria-selected={active} onClick={() => selectScope(value)} className={`relative h-11 min-w-24 rounded-lg px-4 text-sm font-bold transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${active ? "text-black after:absolute after:inset-x-5 after:bottom-0 after:h-0.5 after:rounded-full after:bg-black" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-soft)]"}`}>{value === "all" ? "All" : "Following"}</button>;
            })}
          </div>
        </div>
      </div>

      {displayedStores.length ? (
        <div className={`divide-y divide-[var(--color-border)] border-b border-[var(--color-border)] pb-[calc(76px+env(safe-area-inset-bottom))] transition-opacity md:pb-0 motion-reduce:transition-none ${loading ? "opacity-60" : "opacity-100"}`}>
          {displayedStores.map((store) => <StoreListTile key={store.id} store={store} onFollowChange={handleFollowChange} />)}
        </div>
      ) : (
        <div className="p-4">
          <EmptyState title={emptyTitle}>{emptyDescription}</EmptyState>
          {scope === "following" ? <div className="mt-4 flex justify-center"><button type="button" onClick={() => selectScope("all")} className="inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-bold text-white"><Store aria-hidden className="h-4 w-4" />Browse all stores</button></div> : null}
        </div>
      )}
    </section>
  );
}
