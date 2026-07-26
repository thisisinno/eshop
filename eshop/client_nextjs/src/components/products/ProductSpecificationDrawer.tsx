"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ResponsiveDrawer } from "@/components/ui/ResponsiveDrawer";
import type { ProductDetail } from "@/types/storefront";

const money = (amount: number, currency: string) => `${currency} ${amount.toLocaleString()}`;

export function ProductSpecificationDrawer({ open, product, loading, submitting, error, onClose, onSubmit, returnFocusRef }: {
  open: boolean;
  product: ProductDetail | null;
  loading: boolean;
  submitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (optionIds: number[]) => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const adjustment = useMemo(() => product?.specification_groups.flatMap((group) => group.options).filter((option) => selected.includes(option.id)).reduce((sum, option) => sum + Number(option.price_adjustment), 0) ?? 0, [product, selected]);

  function toggle(groupId: number, optionId: number, multiple: boolean) {
    if (multiple) setSelected((current) => current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]);
    else {
      const group = product?.specification_groups.find((item) => item.id === groupId);
      const groupIds = new Set(group?.options.map((option) => option.id));
      setSelected((current) => [...current.filter((id) => !groupIds.has(id)), optionId]);
    }
  }

  const close = () => { setSelected([]); onClose(); };
  return <ResponsiveDrawer open={open} title="Choose specifications" onClose={close} returnFocusRef={returnFocusRef} footer={product ? <div>
    <div className="mb-3 space-y-1 text-sm"><div className="flex justify-between"><span>Selected adjustments</span><b>{adjustment === 0 ? "Included" : `${adjustment > 0 ? "+" : "-"} ${money(Math.abs(adjustment), product.currency)}`}</b></div><div className="flex justify-between text-base"><span>Final price</span><b>{money(Number(product.price) + adjustment, product.currency)}</b></div></div>
    {error ? <p role="alert" className="mb-2 text-sm font-semibold text-red-600">{error}</p> : null}
    <button type="button" disabled={submitting} onClick={() => onSubmit(selected)} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black px-5 font-bold text-white disabled:opacity-50">{submitting ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}Add to cart</button>
  </div> : undefined}>
    {loading ? <div className="grid min-h-40 place-items-center"><Loader2 aria-label="Loading specifications" className="h-5 w-5 animate-spin" /></div> : product ? <>
      <p className="px-3 pt-2 text-base font-black">{product.name}</p>
      <p className="px-3 pb-3 text-sm text-[var(--color-text-secondary)]">Base price: {money(Number(product.price), product.currency)}</p>
      {product.specification_groups.map((group) => <fieldset key={group.id} className="border-t border-[var(--color-border)] py-3">
        <legend className="px-3 font-black">{group.name}{group.is_required ? <span className="ml-1 text-red-600">*</span> : null}</legend>
        {group.options.map((option) => {
          const checked = selected.includes(option.id);
          const amount = Number(option.price_adjustment);
          return <label key={option.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 hover:bg-[var(--color-primary-soft)]">
            <input type={group.selection_mode === "single" ? "radio" : "checkbox"} name={`specification-${group.id}`} checked={checked} onChange={() => toggle(group.id, option.id, group.selection_mode === "multiple")} className="h-5 w-5 accent-black" />
            <span className="flex-1 font-semibold">{option.value}</span>
            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{amount === 0 ? "Included" : `${amount > 0 ? "+" : "-"} ${money(Math.abs(amount), product.currency)}`}</span>
          </label>;
        })}
      </fieldset>)}
    </> : null}
  </ResponsiveDrawer>;
}
