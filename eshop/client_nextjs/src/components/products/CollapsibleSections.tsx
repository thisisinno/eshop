"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { ProductDetail } from "@/types/storefront";

export function CollapsibleSections({ product }: { product: ProductDetail }) {
  const sections = [
    ["Description", product.description || "No description provided."],
    ["Specifications", Object.keys(product.specifications || {}).length ? JSON.stringify(product.specifications, null, 2) : "No specifications listed."],
    ["Shipping / delivery", "Delivery options and final availability are confirmed during checkout."],
    ["Store information", `${product.store.business_name}${product.store.location_summary ? ` · ${product.store.location_summary}` : ""}`],
  ] as const;
  const [open, setOpen] = useState("Description");
  return (
    <section className="mt-4 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-sm">
      {sections.map(([title, content]) => (
        <div key={title} className="border-b border-[var(--color-border)] last:border-b-0">
          <button className="flex w-full items-center justify-between px-4 py-4 text-left font-bold" onClick={() => setOpen((current) => current === title ? "" : title)}>
            {title}<ChevronRight aria-hidden className={`h-5 w-5 transition ${open === title ? "rotate-90 text-[var(--color-primary)]" : ""}`} />
          </button>
          {open === title ? <div className="px-4 pb-4 text-sm leading-6 text-[var(--color-text-secondary)] whitespace-pre-wrap">{content}</div> : null}
        </div>
      ))}
    </section>
  );
}
