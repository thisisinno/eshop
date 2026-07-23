"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CheckCircle2, Heart, Home, LayoutGrid, Plus, Search, ShoppingBag, Store, User as UserIcon } from "lucide-react";
import type { Cart, ProductCard, StoreSummary, User } from "@/types/storefront";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCart } from "@/components/cart/CartProvider";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";

const nav = [
  { label: "Home", href: "/", Icon: Home },
  { label: "Categories", href: "/categories", Icon: LayoutGrid },
  { label: "Search", href: "/search", Icon: Search },
  { label: "Saved", href: "/saved", Icon: Heart },
  { label: "Cart", href: "/cart", Icon: ShoppingBag },
] as const;

function initials(user: User | null) {
  if (!user) return "";
  const source = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Header({ user }: { user: User | null }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-[58px] items-center justify-between border-b border-[var(--color-border)] bg-white/95 px-4 backdrop-blur md:hidden">
      <Link href="/" className="text-xl font-black text-[var(--color-primary)]">eShop</Link>
      <div className="flex items-center gap-2">
        <Link aria-label="Notifications" href="/profile" className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text)]">
          <Bell aria-hidden className="h-5 w-5" />
        </Link>
        <Link aria-label="Profile" href={user ? "/profile" : "/auth/sign-in"} className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-slate-100 text-sm font-bold text-[var(--color-text)]">
          {initials(user) || <UserIcon aria-hidden className="h-5 w-5" />}
        </Link>
      </div>
    </header>
  );
}

export function LeftNav({ user, canPost }: { user: User | null; canPost: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen border-r border-[var(--color-border)] bg-white md:block md:w-[78px] xl:w-[250px]">
      <div className="flex h-full flex-col gap-2 p-3">
        <Link href="/" className="mb-3 hidden px-3 text-2xl font-black text-[var(--color-primary)] xl:block">eShop</Link>
        {nav.map(({ label, href, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link key={href} href={href} className={`relative flex h-12 items-center justify-center gap-3 rounded-lg text-[var(--color-text-secondary)] transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] xl:justify-start xl:px-4 ${active ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]" : ""}`}>
              {active ? <span className="absolute left-0 top-2 hidden h-8 w-1 rounded-r-full bg-[var(--color-primary)] xl:block" /> : null}
              <Icon aria-hidden className="h-5 w-5" strokeWidth={2.2} />
              <span className="hidden text-base font-semibold xl:inline">{label}</span>
            </Link>
          );
        })}
        {canPost ? (
          <ButtonLink href="/post/product" className="mt-3 md:h-12 md:w-12 md:p-0 xl:w-auto xl:px-4" aria-label="Post product">
            <Plus aria-hidden className="h-5 w-5" /><span className="hidden xl:inline">Post product</span>
          </ButtonLink>
        ) : null}
        <Link href={user ? "/profile" : "/auth/sign-in"} className="mt-auto flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 font-semibold text-[var(--color-text)] transition hover:bg-slate-100">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-sm">{initials(user) || <UserIcon aria-hidden className="h-4 w-4" />}</span>
          <span className="hidden truncate xl:inline">{user ? user.username : "Sign in"}</span>
        </Link>
      </div>
    </aside>
  );
}

export function BottomNav({ canPost }: { canPost: boolean }) {
  const pathname = usePathname();
  const { count } = useCart();
  return (
    <>
      {canPost ? <Link aria-label="Post product" href="/post/product" className="fixed bottom-[calc(82px+env(safe-area-inset-bottom))] right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[var(--color-primary)] text-white shadow-[0_12px_28px_rgba(37,99,235,.35)] transition hover:-translate-y-1 active:scale-[0.97] md:hidden"><Plus aria-hidden className="h-7 w-7" /></Link> : null}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[76px] grid-cols-5 border-t border-[var(--color-border)] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {nav.map(({ label, href, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link key={href} href={href} className={`relative flex min-h-11 flex-col items-center justify-center gap-1 text-xs font-semibold transition active:scale-[0.98] ${active ? "text-[var(--color-primary)]" : "text-slate-600"}`}>
              <span className={`absolute top-1 h-1 w-5 rounded-full transition ${active ? "bg-[var(--color-primary)] opacity-100" : "opacity-0"}`} />
              <span className="relative">
                <Icon aria-hidden className={`h-5 w-5 transition ${active ? "scale-110" : ""}`} strokeWidth={2.2} />
                {href === "/cart" && count > 0 ? <span className="absolute -right-2 -top-2 grid min-h-4 min-w-4 place-items-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-black text-white">{count > 99 ? "99+" : count}</span> : null}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function RightRail({ stores, recent, cart }: { stores: StoreSummary[]; recent: ProductCard[]; cart: Cart | null }) {
  return (
    <aside className="fixed right-0 top-0 z-20 hidden h-screen w-[330px] overflow-y-auto border-l border-[var(--color-border)] bg-white/75 p-5 backdrop-blur xl:block">
      <div className="space-y-4">
        <Card className="p-4">
          <h2 className="font-black">Trending Stores</h2>
          <div className="mt-3 space-y-3">
            {stores.map((store) => {
              const logo = resolveMediaUrl(store.logo_url);
              return (
                <Link key={store.id} href={`/stores/${store.slug}`} className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-slate-50">
                  <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-sm font-bold">
                    {logo ? <Image src={logo} alt="" fill sizes="40px" className="object-cover" /> : <Store aria-hidden className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 truncate text-sm font-bold">{store.business_name}{store.is_verified ? <CheckCircle2 aria-label="Verified" className="h-3.5 w-3.5 text-[var(--color-primary)]" /> : null}</span>
                    <span className="block text-xs text-[var(--color-text-secondary)]">{store.product_count} products</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="font-black">Recently Viewed</h2>
          <div className="mt-3 space-y-3">
            {recent.length ? recent.map((product) => <Link key={product.id} href={`/products/${product.id}`} className="block truncate rounded-lg p-2 text-sm font-semibold hover:bg-slate-50">{product.name}</Link>) : <p className="text-sm text-[var(--color-text-secondary)]">Open products to build your history.</p>}
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="font-black">Compact Cart</h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{cart ? `${cart.total_quantity} items · ${Number(cart.subtotal).toLocaleString()}` : "Sign in to sync your cart."}</p>
          <ButtonLink href="/cart" variant="outline" className="mt-4 w-full">Open cart</ButtonLink>
        </Card>
      </div>
    </aside>
  );
}
