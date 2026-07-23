"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Cart } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCart } from "./CartProvider";

const money = (amount: string, currency = "TZS") => `${currency} ${Number(amount).toLocaleString()}`;

export function CartClient({ initialCart }: { initialCart: Cart }) {
  const [cart, setCart] = useState(initialCart);
  const [busy, setBusy] = useState<number | null>(null);
  const { setCount } = useCart();

  async function updateItem(itemId: number, quantity: number) {
    const previous = cart;
    setBusy(itemId);
    if (quantity <= 0) {
      setCart((current) => ({ ...current, items: current.items.filter((item) => item.id !== itemId), total_quantity: current.total_quantity - (current.items.find((item) => item.id === itemId)?.quantity ?? 0) }));
      const response = await fetch(`/api/storefront/cart/items/${itemId}/`, { method: "DELETE" });
      setBusy(null);
      if (!response.ok) { setCart(previous); setCount(previous.total_quantity); toast.error("Could not remove item."); return; }
      const refreshed = await fetch("/api/storefront/cart/").then((res) => res.json()) as Cart;
      setCart(refreshed); setCount(refreshed.total_quantity); return;
    }
    setCart((current) => ({ ...current, items: current.items.map((item) => item.id === itemId ? { ...item, quantity } : item) }));
    const response = await fetch(`/api/storefront/cart/items/${itemId}/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity }) });
    setBusy(null);
    if (!response.ok) { setCart(previous); setCount(previous.total_quantity); toast.error("Could not update quantity."); return; }
    const next = await response.json() as Cart;
    setCart(next); setCount(next.total_quantity);
  }

  if (!cart.items.length) return <EmptyState title="Your cart is empty" action={<ButtonLink href="/search">Find products</ButtonLink>}>Products you add will appear here.</EmptyState>;

  return (
    <section>
      <div className="border-b border-[var(--color-border)] px-4 py-4">
        <h1 className="text-2xl font-black md:text-3xl">Cart</h1>
      </div>
      <div className="grid gap-5 p-3 md:p-4 lg:grid-cols-[1fr_260px]">
        <div className="space-y-3">
          {cart.items.map((item) => {
            const image = resolveMediaUrl(item.product.primary_media_url);
            return (
              <article key={item.id} className="grid grid-cols-[86px_1fr] gap-3 border-b border-[var(--color-border)] bg-white py-3">
                <Link href={`/products/${item.product.id}`} className="relative aspect-square overflow-hidden rounded-xl bg-[var(--color-primary-soft)]">
                  {image ? <Image src={image} alt={item.product.name} fill sizes="86px" className="object-cover" /> : null}
                </Link>
                <div className="min-w-0">
                  <Link href={`/products/${item.product.id}`} className="line-clamp-2 font-bold leading-5">{item.product.name}</Link>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{item.product.store.business_name}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="font-black">{money(item.line_total, item.product.currency)}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 items-center rounded-full border border-[var(--color-border-strong)]">
                        <button disabled={busy === item.id} aria-label="Decrease quantity" onClick={() => updateItem(item.id, item.quantity - 1)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-[var(--color-primary-soft)]"><Minus aria-hidden className="h-4 w-4" /></button>
                        <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                        <button disabled={busy === item.id} aria-label="Increase quantity" onClick={() => updateItem(item.id, item.quantity + 1)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-[var(--color-primary-soft)]"><Plus aria-hidden className="h-4 w-4" /></button>
                      </div>
                      <button disabled={busy === item.id} aria-label="Remove item" onClick={() => updateItem(item.id, 0)} className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border-strong)] text-[var(--color-text)] hover:bg-[var(--color-primary-soft)]"><Trash2 aria-hidden className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{item.product.stock_quantity > 0 ? "In stock" : "Out of stock"}</p>
                </div>
              </article>
            );
          })}
        </div>
        <aside className="sticky bottom-[calc(84px+env(safe-area-inset-bottom))] border-t border-[var(--color-border)] bg-white p-4 md:bottom-4 lg:top-5 lg:self-start lg:border-t-0">
          <h2 className="text-lg font-black">Order summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span>Total items</span><b>{cart.total_quantity}</b></div>
            <div className="flex justify-between"><span>Subtotal</span><b>{money(cart.subtotal, cart.items[0]?.product.currency)}</b></div>
            <div className="flex justify-between text-[var(--color-text-secondary)]"><span>Delivery</span><span>Calculated later</span></div>
          </div>
          <ButtonLink href="/checkout" className="mt-5 w-full">Checkout</ButtonLink>
        </aside>
      </div>
    </section>
  );
}
