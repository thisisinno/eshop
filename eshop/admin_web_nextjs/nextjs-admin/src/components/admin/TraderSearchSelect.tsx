"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";
import type { TraderProfile } from "@/types/registration";

const input = "w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white";

type Props = {
  name: string;
  label: string;
  required?: boolean;
  defaultTraderId?: number;
  onSelected?: (trader: TraderProfile) => void;
};

/** A lightweight server-backed business picker for registration forms. */
export function TraderSearchSelect({ name, label, required = false, defaultTraderId, onSelected }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TraderProfile[]>([]);
  const [selected, setSelected] = useState<TraderProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!defaultTraderId) return;
    void apiGet<TraderProfile>(`/registration/traders/${defaultTraderId}/`).then(selectTrader).catch(() => undefined);
  }, [defaultTraderId]);

  useEffect(() => {
    const term = query.trim();
    if (!term || selected) {
      setResults([]);
      return;
    }
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await apiGet<TraderProfile[]>(`/registration/traders/?search=${encodeURIComponent(term)}&limit=8`));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [query, selected]);

  useEffect(() => {
    if (!showPreview) return;
    const timeout = window.setTimeout(() => setShowPreview(false), 3200);
    return () => window.clearTimeout(timeout);
  }, [showPreview]);

  function selectTrader(trader: TraderProfile) {
    setSelected(trader);
    setQuery("");
    setResults([]);
    setOpen(false);
    setShowPreview(true);
    onSelected?.(trader);
  }

  function clear() {
    setSelected(null);
    setShowPreview(false);
    setQuery("");
  }

  const location = selected ? [selected.region, selected.district].filter(Boolean).join(", ") || "No location recorded" : "";

  return <div className="relative md:col-span-2">
    <label className="block font-medium text-dark dark:text-white">{label}{required ? " *" : ""}</label>
    <input type="hidden" name={name} value={selected?.id ?? ""} />
    {selected ? <div className={`${input} mt-2 flex min-h-12 items-center justify-between gap-3`}>
      <span><span className="block font-medium">{selected.business_name}</span><span className="text-xs text-body-color">{selected.trader_code}</span></span>
      <button type="button" onClick={clear} className="text-sm text-red hover:underline">Clear</button>
    </div> : <>
      <input className={`${input} mt-2`} value={query} onChange={event => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search business, trader ID, owner, phone, or email" autoComplete="off" />
      {open && <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-lg border border-stroke bg-white p-2 shadow-lg dark:border-dark-3 dark:bg-gray-dark">
        {loading && <p className="px-3 py-2 text-sm">Searching traders…</p>}
        {!loading && query.trim() && !results.length && <p className="px-3 py-2 text-sm">No trader found. Try a business name, trader ID, phone, or email.</p>}
        {!loading && !query.trim() && <p className="px-3 py-2 text-sm">Start typing to search registered traders.</p>}
        {results.map(trader => <button key={trader.id} type="button" onClick={() => selectTrader(trader)} className="block w-full rounded-md px-3 py-3 text-left hover:bg-gray-1 dark:hover:bg-dark-2">
          <span className="block font-medium text-dark dark:text-white">{trader.business_name}</span>
          <span className="block text-xs text-primary">{trader.trader_code}</span>
          <span className="block text-xs text-body-color">{trader.phone} · {trader.status} · {[trader.region, trader.district].filter(Boolean).join(", ") || "No location"}</span>
        </button>)}
      </div>}
    </>}
    {showPreview && selected && <aside className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm dark:bg-dark-2" role="status">
      <div className="flex justify-between gap-4"><div><p className="font-semibold text-dark dark:text-white">{selected.business_name}</p><p className="text-primary">{selected.trader_code}</p></div><span className="capitalize">{selected.status}</span></div>
      <p className="mt-2">Owner: {selected.owner_full_name || "—"} · {selected.phone}</p>
      <p>{selected.email || "No email"} · {location}</p>
    </aside>}
  </div>;
}
