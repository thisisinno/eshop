"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { ProductDetail } from "@/types/storefront";

const money = (amount: string, currency: string) => `${currency} ${Number(amount).toLocaleString()}`;

export function CollapsibleSections({ product }: { product: ProductDetail }) {
  const specs = Object.entries(product.specifications || {}).filter(([, value]) => value !== null && value !== undefined && String(value).trim());
  const sections = [
    { title: "About this item", content: product.description || "No description provided.", kind: "text" },
    { title: "Product specifications", content: specs, kind: "specs" },
    { title: "Delivery", content: Number(product.delivery_fee) > 0 ? `${money(product.delivery_fee, product.currency)} delivery` : "Free delivery", kind: "text" },
    { title: "Store information", content: `${product.store.business_name}${product.store.location_summary ? ` · ${product.store.location_summary}` : ""}`, kind: "text" },
  ] as const;
  const [open, setOpen] = useState("About this item");
  return (
    <section className="product-detail-sections overflow-hidden border-y border-[var(--color-border)] bg-white">
      {sections.map((section) => (
        <div key={section.title} className="product-detail-section border-b border-[var(--color-border)]">
          <button className="product-detail-section-button flex w-full items-center justify-between px-4 py-4 text-left font-bold" onClick={() => setOpen((current) => current === section.title ? "" : section.title)}>
            {section.title}<ChevronRight aria-hidden className={`product-detail-section-chevron h-5 w-5 transition ${open === section.title ? "rotate-90 text-[var(--color-text)]" : ""}`} />
          </button>
          <div className={`product-detail-section-content ${open === section.title ? "block" : "hidden"} px-4 pb-4 text-sm leading-6 text-[var(--color-text-secondary)]`}>
              {section.kind === "specs" ? <SpecificationRows specs={section.content} /> : <p className="whitespace-pre-wrap">{section.content}</p>}
          </div>
        </div>
      ))}
    </section>
  );
}

function SpecificationRows({ specs }: { specs: [string, unknown][] }) {
  if (!specs.length) return <p>No specifications listed.</p>;
  return (
    <dl className="divide-y divide-[var(--color-border)]">
      {specs.map(([key, value]) => (
        <div key={key} className="grid gap-1 py-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
          <dt className="font-bold text-[var(--color-text)]">{key}</dt>
          <dd className="min-w-0 break-words">{String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
