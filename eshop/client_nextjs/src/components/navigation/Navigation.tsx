"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  ChevronsUp,
  Ellipsis,
  Home,
  List,
  LogIn,
  LogOut,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Store,
  User as UserIcon,
  X,
} from "lucide-react";
import type { Cart, ProductCard, StoreSummary, User } from "@/types/storefront";
import { ButtonLink } from "@/components/ui/Button";
import { useCart } from "@/components/cart/CartProvider";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";

const primaryNav = [
  { label: "Home", href: "/", Icon: Home },
  { label: "Search", href: "/search", Icon: Search },
  { label: "Notifications", href: "/notifications", Icon: Bell },
  { label: "Profile", href: "/profile", Icon: UserIcon },
] as const;

const mobileNav = [
  { label: "Home", href: "/", Icon: Home },
  { label: "Notifications", href: "/notifications", Icon: Bell },
  { label: "Profile", href: "/profile", Icon: UserIcon },
] as const;

function initials(user: User | null) {
  if (!user) return "";
  const source = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return <span className="absolute -right-1 top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[var(--color-black)] px-1 text-[10px] font-black text-white">{count > 99 ? "99+" : count}</span>;
}

function CartLink() {
  const { count } = useCart();
  return (
    <Link aria-label="Cart" href="/cart" className="relative grid h-11 w-11 place-items-center rounded-full text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)] active:scale-[0.97]">
      <ShoppingBag aria-hidden className="h-5 w-5" />
      <NavBadge count={count} />
    </Link>
  );
}

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-[58px] items-center justify-between border-b border-[var(--color-border)] bg-white/95 px-4 backdrop-blur md:hidden">
      <Link href="/" className="text-xl font-black text-[var(--color-text)]">eShop</Link>
      <CartLink />
    </header>
  );
}

function moreItems(canPost: boolean) {
  return [
    { href: "/search", label: "Search", Icon: Search },
    { href: "/categories", label: "Categories", Icon: List },
    { href: "/saved", label: "My List", Icon: Check },
    { href: "/orders", label: "Orders", Icon: Package },
    { href: "/cart", label: "Cart", Icon: ShoppingBag },
    { href: "/search?tab=stores", label: "Stores", Icon: Store },
    { href: "/profile", label: "Settings", Icon: Settings },
    ...(canPost ? [{ href: "/post/product", label: "Post product", Icon: Plus }] : []),
  ];
}

function MoreMenuButton({ user, canPost, className, labelClassName = "hidden text-base xl:inline" }: { user: User | null; canPost: boolean; className?: string; labelClassName?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} aria-label="More">
        <Ellipsis aria-hidden className="h-5 w-5" strokeWidth={2.2} />
        <span className={labelClassName}>More</span>
      </button>
      <MoreSheet open={open} onClose={() => setOpen(false)} user={user} canPost={canPost} />
    </>
  );
}

export function LeftNav({ user, canPost, unreadCount }: { user: User | null; canPost: boolean; unreadCount: number }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const items = useMemo(() => moreItems(canPost), [canPost]);
  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen bg-white md:block md:w-[78px] xl:w-[260px] 2xl:w-[275px]">
      <div className="ml-auto flex h-full w-[78px] flex-col gap-2 border-r border-[var(--color-border)] p-3 xl:w-[250px] xl:border-r-0">
        <Link href="/" className="mb-2 flex h-12 items-center rounded-full px-3 text-2xl font-black text-[var(--color-text)] xl:w-fit">eShop</Link>
        {primaryNav.map(({ label, href, Icon }) => {
          const target = label === "Profile" && !user ? "/auth/sign-in" : href;
          const active = isActive(pathname, href);
          return (
            <Link key={href} href={target} aria-label={label} className={`relative flex h-12 items-center justify-center gap-4 rounded-full text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)] active:scale-[0.98] xl:w-fit xl:justify-start xl:px-4 ${active ? "font-black" : "font-medium"}`}>
              <Icon aria-hidden className="h-6 w-6" strokeWidth={active ? 2.7 : 2.1} />
              <span className="hidden text-xl xl:inline">{label}</span>
              {label === "Notifications" ? <NavBadge count={unreadCount} /> : null}
            </Link>
          );
        })}
        <button type="button" onClick={() => setExpanded((current) => !current)} aria-expanded={expanded} className="flex h-12 items-center justify-center gap-4 rounded-full text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)] active:scale-[0.98] xl:w-fit xl:justify-start xl:px-4 xl:text-xl">
          {expanded ? <ChevronsUp aria-hidden className="h-5 w-5" /> : <Ellipsis aria-hidden className="h-5 w-5" strokeWidth={2.2} />}
          <span className="hidden text-base xl:inline">{expanded ? "Swipe up" : "More"}</span>
        </button>
        <div className={`min-h-0 overflow-hidden transition-all duration-180 ${expanded ? "max-h-[34vh] border-y border-[var(--color-border)] py-2" : "max-h-0"}`}>
          <nav className="flex max-h-[34vh] min-h-0 flex-col gap-1 overflow-y-auto pr-1">
            {items.map(({ href, label, Icon }) => <Link key={href} href={href} aria-label={label} className="flex h-11 items-center justify-center gap-4 rounded-full text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)] active:scale-[0.98] xl:w-fit xl:justify-start xl:px-4"><Icon aria-hidden className="h-5 w-5" /><span className="hidden xl:inline">{label}</span></Link>)}
          </nav>
        </div>
        {canPost ? (
          <ButtonLink href="/post/product" className="mt-3 h-12 w-12 p-0 xl:w-[210px] xl:px-5" aria-label="Post product">
            <Plus aria-hidden className="h-5 w-5" /><span className="hidden xl:inline">Post product</span>
          </ButtonLink>
        ) : null}
        <Link href={user ? "/profile" : "/auth/sign-in"} className="mt-auto flex min-h-12 items-center gap-3 rounded-full px-2 py-2 text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)] xl:px-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-primary-soft)] text-sm font-black">{initials(user) || <UserIcon aria-hidden className="h-5 w-5" />}</span>
          <span className="hidden min-w-0 xl:block">
            <span className="block truncate text-sm font-bold">{user ? user.username : "Sign in"}</span>
            <span className="block truncate text-xs text-[var(--color-text-secondary)]">{user ? user.email : "Customer account"}</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}

export function BottomNav({ user, canPost, unreadCount }: { user: User | null; canPost: boolean; unreadCount: number }) {
  const pathname = usePathname();
  return (
    <>
      {canPost ? <Link aria-label="Post product" href="/post/product" className="fixed bottom-[calc(86px+env(safe-area-inset-bottom))] right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[var(--color-black)] text-white transition active:scale-[0.97] md:hidden"><Plus aria-hidden className="h-7 w-7" /></Link> : null}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[76px] grid-cols-4 border-t border-[var(--color-border)] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {mobileNav.map(({ label, href, Icon }) => {
          const target = label === "Profile" && !user ? "/auth/sign-in" : href;
          const active = isActive(pathname, href);
          return (
            <Link key={href} href={target} className={`relative flex min-h-11 flex-col items-center justify-center gap-1 text-xs transition active:scale-[0.97] ${active ? "font-black text-[var(--color-text)]" : "font-semibold text-[var(--color-text-secondary)]"}`}>
              <span className={`absolute top-1 h-1 w-5 rounded-full bg-[var(--color-black)] transition ${active ? "opacity-100" : "opacity-0"}`} />
              <Icon aria-hidden className="h-5 w-5" strokeWidth={active ? 2.7 : 2.1} />
              {label}
              {label === "Notifications" ? <NavBadge count={unreadCount} /> : null}
            </Link>
          );
        })}
        <MoreMenuButton user={user} canPost={canPost} className="relative flex min-h-11 flex-col items-center justify-center gap-1 text-xs font-semibold text-[var(--color-text-secondary)] transition active:scale-[0.97]" labelClassName="text-xs" />
      </nav>
    </>
  );
}

function MoreSheet({ open, onClose, user, canPost }: { open: boolean; onClose: () => void; user: User | null; canPost: boolean }) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const items = useMemo(() => moreItems(canPost), [canPost]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = panelRef.current?.querySelector<HTMLElement>("a,button");
    first?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;
  function go(href: string) {
    onClose();
    router.push(href);
  }
  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="More navigation">
      <button aria-label="Close more menu" className="absolute inset-0 h-full w-full bg-black/20 opacity-100 transition" onClick={onClose} />
      <div ref={panelRef} className="absolute inset-x-0 bottom-0 max-h-[82vh] translate-y-0 rounded-t-2xl border-t border-[var(--color-border)] bg-white p-4 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-none transition md:left-1/2 md:right-auto md:top-20 md:h-fit md:w-[360px] md:-translate-x-1/2 md:rounded-2xl md:border">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black">More</h2>
          <button aria-label="Close" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full hover:bg-[var(--color-primary-soft)]"><X aria-hidden className="h-5 w-5" /></button>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {items.map(({ href, label, Icon }) => (
            <button key={href} onClick={() => go(href)} className="flex min-h-12 w-full items-center gap-4 py-2 text-left font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]">
              <Icon aria-hidden className="h-5 w-5" />
              {label}
            </button>
          ))}
          {user ? (
            <form action="/api/auth/sign-out" method="post">
              <button className="flex min-h-12 w-full items-center gap-4 py-2 text-left font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]"><LogOut aria-hidden className="h-5 w-5" />Sign out</button>
            </form>
          ) : (
            <button onClick={() => go("/auth/sign-in")} className="flex min-h-12 w-full items-center gap-4 py-2 text-left font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]"><LogIn aria-hidden className="h-5 w-5" />Sign in</button>
          )}
        </div>
      </div>
    </div>
  );
}

export function RightRail({ stores, recent, cart }: { stores: StoreSummary[]; recent: ProductCard[]; cart: Cart | null }) {
  return (
    <aside className="fixed right-0 top-0 z-20 hidden h-screen w-[330px] overflow-y-auto bg-white p-6 xl:block 2xl:w-[350px]">
      <div className="space-y-7">
        <section>
          <h2 className="text-xl font-black">Trending stores</h2>
          <div className="mt-3 divide-y divide-[var(--color-border)]">
            {stores.map((store) => {
              const logo = resolveMediaUrl(store.logo_url);
              return (
                <Link key={store.id} href={`/stores/${store.slug}`} className="flex items-center gap-3 py-3 transition hover:bg-[var(--color-primary-soft)]">
                  <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--color-primary-soft)] text-sm font-bold">
                    {logo ? <Image src={logo} alt="" fill sizes="40px" className="object-cover" /> : <Store aria-hidden className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 truncate text-sm font-bold">{store.business_name}{store.is_verified ? <CheckCircle2 aria-label="Verified" className="h-3.5 w-3.5 text-[var(--color-text)]" /> : null}</span>
                    <span className="block text-xs text-[var(--color-text-secondary)]">{store.product_count} products</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
        <section>
          <h2 className="text-xl font-black">Recently viewed</h2>
          <div className="mt-3 divide-y divide-[var(--color-border)]">
            {recent.length ? recent.map((product) => <Link key={product.id} href={`/products/${product.id}`} className="block truncate py-3 text-sm font-semibold hover:bg-[var(--color-primary-soft)]">{product.name}</Link>) : <p className="py-3 text-sm text-[var(--color-text-secondary)]">Open products to build your history.</p>}
          </div>
        </section>
        <section>
          <h2 className="text-xl font-black">Cart</h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{cart ? `${cart.total_quantity} items · TZS ${Number(cart.subtotal).toLocaleString()}` : "Sign in to sync your cart."}</p>
          <Link href="/cart" className="mt-3 inline-flex text-sm font-bold hover:underline">Open cart</Link>
        </section>
      </div>
    </aside>
  );
}
