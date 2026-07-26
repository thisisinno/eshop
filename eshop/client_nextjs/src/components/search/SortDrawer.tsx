"use client";

import { Check } from "lucide-react";
import { ResponsiveDrawer } from "@/components/ui/ResponsiveDrawer";

export const SORT_OPTIONS = [
  ["newest", "Newest"],
  ["popularity", "Popular"],
  ["best_selling", "Best selling"],
  ["price_asc", "Lowest price"],
  ["price_desc", "Highest price"],
] as const;

export function SortDrawer({ open, value, onChange, onClose, returnFocusRef }: {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return <ResponsiveDrawer open={open} title="Sort results" onClose={onClose} returnFocusRef={returnFocusRef} closeLabel="Close sort options">
    <div role="radiogroup" aria-label="Sort results">
      {SORT_OPTIONS.map(([option, label]) => <button key={option} role="radio" aria-checked={value === option} type="button" onClick={() => { onChange(option); onClose(); }} className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left font-semibold hover:bg-[var(--color-primary-soft)] focus-visible:outline focus-visible:outline-2">
        <span className="grid h-5 w-5 place-items-center">{value === option ? <Check aria-hidden className="h-5 w-5" strokeWidth={3} /> : null}</span>
        {label}
      </button>)}
    </div>
  </ResponsiveDrawer>;
}
