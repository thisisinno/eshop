"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  ChevronUp,
  Check,
  Ellipsis,
  Home,
  LogIn,
  LogOut,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Store,
  User as UserIcon,
  X,
} from "lucide-react";
import type { Cart, ProductCard, SiteBranding, StoreSummary, User } from "@/types/storefront";
import { ButtonLink } from "@/components/ui/Button";
import { useMyList } from "@/components/bookmarks/MyListProvider";
import { useCart } from "@/components/cart/CartProvider";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import { VerifiedBusinessBadge } from "@/components/store/VerifiedBusinessBadge";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import { BrandLogo } from "./BrandLogo";

const primaryNav = [
  { label: "Home", href: "/", Icon: Home },
  { label: "My List", href: "/saved", Icon: Check },
  { label: "Notifications", href: "/notifications", Icon: Bell },
  { label: "Cart", href: "/cart", Icon: ShoppingBag },
] as const;

const mobileNav = [
  { label: "Home", href: "/", Icon: Home },
  { label: "My List", href: "/saved", Icon: Check },
  { label: "Notifications", href: "/notifications", Icon: Bell },
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
  const label = count > 99 ? "99+" : String(count);
  return <span className="absolute -right-2 -top-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--color-black)] px-1 text-[10px] font-black leading-none text-white transition duration-180 motion-reduce:transition-none">{label}</span>;
}

function IconWithBadge({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <span className="relative inline-flex">
      {children}
      <NavBadge count={count} />
    </span>
  );
}

function CartLink() {
  const { count } = useCart();
  return (
    <Link aria-label="Cart" href="/cart" className="relative grid h-11 w-11 place-items-center rounded-full text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)] active:scale-[0.97]">
      <IconWithBadge count={count}>
        <ShoppingBag aria-hidden className="h-5 w-5" />
      </IconWithBadge>
    </Link>
  );
}

export function Header({ branding, user }: { branding: SiteBranding; user: User | null }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-[58px] items-center justify-between border-b border-[var(--color-border)] bg-white/95 px-4 backdrop-blur md:hidden">
      <BrandLogo branding={branding} user={user} className="h-10 w-10" />
      <div className="pointer-events-none absolute left-1/2 max-w-[calc(100vw-128px)] -translate-x-1/2 truncate text-base font-black text-[var(--color-text)]">
        {branding.site_name || "eShop"}
      </div>
      <CartLink />
    </header>
  );
}

function moreItems(canPost: boolean) {
  return [
    { href: "/search", label: "Search", Icon: Search },
    { href: "/profile", label: "Profile", Icon: UserIcon },
    { href: "/orders", label: "Orders", Icon: Package },
    { href: "/search?tab=stores", label: "Stores", Icon: Store },
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

export function LeftNav({ user, canPost, branding }: { user: User | null; canPost: boolean; branding: SiteBranding }) {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const { count: myListCount } = useMyList();
  const { count: cartCount } = useCart();
  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen bg-white md:block md:w-[78px] xl:w-[260px] 2xl:w-[275px]">
      <div className="ml-auto flex h-full min-h-0 w-[78px] flex-col gap-2 border-r border-[var(--color-border)] p-3 xl:w-[250px] xl:border-r-0">
        <div className="mb-2 flex h-12 items-center px-3">
          <BrandLogo branding={branding} user={user} className="h-12 w-12" />
        </div>
        <nav className="flex min-h-0 flex-col gap-2">
        {primaryNav.map(({ label, href, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link key={href} href={href} aria-label={label} className={`relative flex h-12 items-center justify-center gap-4 rounded-full text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)] active:scale-[0.98] xl:w-fit xl:justify-start xl:px-4 ${active ? "font-black" : "font-medium"}`}>
              {label === "Notifications" || label === "My List" || label === "Cart" ? (
                <IconWithBadge count={label === "Notifications" ? unreadCount : label === "My List" ? myListCount : cartCount}>
                  <Icon aria-hidden className="h-6 w-6" strokeWidth={active ? 2.7 : 2.1} />
                </IconWithBadge>
              ) : <Icon aria-hidden className="h-6 w-6" strokeWidth={active ? 2.7 : 2.1} />}
              <span className="hidden text-xl xl:inline">{label}</span>
            </Link>
          );
        })}
        <DesktopMoreNavigation user={user} canPost={canPost} pathname={pathname} />
        </nav>
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

export function BottomNav({ user, canPost }: { user: User | null; canPost: boolean }) {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const { count: myListCount } = useMyList();
  const suppressFab = pathname === "/cart" || pathname === "/checkout" || pathname.startsWith("/checkout/");
  return (
    <>
      {canPost && !suppressFab ? (
        <Link aria-label="Post product" href="/post/product" className="post-fab fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-4 z-50 inline-flex h-12 items-center gap-2 rounded-full bg-black px-3.5 pr-4 text-white shadow-[0_8px_28px_rgba(0,0,0,0.22)] transition hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black active:scale-[0.97] md:hidden">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-black">
            <Plus aria-hidden className="h-4.5 w-4.5 text-black" strokeWidth={3} />
          </span>
          <span className="text-sm font-black text-white">POST</span>
        </Link>
      ) : null}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[76px] grid-cols-4 border-t border-[var(--color-border)] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {mobileNav.map(({ label, href, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link key={href} href={href} className={`relative flex min-h-11 flex-col items-center justify-center gap-1 text-xs transition active:scale-[0.97] ${active ? "font-black text-[var(--color-text)]" : "font-semibold text-[var(--color-text-secondary)]"}`}>
              <span className={`absolute top-1 h-1 w-5 rounded-full bg-[var(--color-black)] transition ${active ? "opacity-100" : "opacity-0"}`} />
              {label === "Notifications" || label === "My List" ? (
                <IconWithBadge count={label === "Notifications" ? unreadCount : myListCount}>
                  <Icon aria-hidden className="h-5 w-5" strokeWidth={active ? 2.7 : 2.1} />
                </IconWithBadge>
              ) : <Icon aria-hidden className="h-5 w-5" strokeWidth={active ? 2.7 : 2.1} />}
              {label}
            </Link>
          );
        })}
        <MoreMenuButton user={user} canPost={canPost} className="relative flex min-h-11 flex-col items-center justify-center gap-1 text-xs font-semibold text-[var(--color-text-secondary)] transition active:scale-[0.97]" labelClassName="text-xs" />
      </nav>
    </>
  );
}

function DesktopMoreNavigation({ user, canPost, pathname }: { user: User | null; canPost: boolean; pathname: string }) {
  const [open, setOpen] = useState(false);
  const items = useMemo(() => moreItems(canPost), [canPost]);
  const moreActive = items.some((item) => isActive(pathname, item.href.split("?")[0]));
  return (
    <div className="min-h-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="desktop-more-navigation"
        aria-label={open ? "Collapse more navigation" : "Expand more navigation"}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-12 items-center justify-center gap-4 rounded-full text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)] active:scale-[0.98] xl:w-fit xl:justify-start xl:px-4 xl:text-xl ${open || moreActive ? "font-black" : "font-medium"}`}
      >
        {open ? <ChevronUp aria-hidden className="h-6 w-6" strokeWidth={2.6} /> : <Ellipsis aria-hidden className="h-6 w-6" strokeWidth={2.2} />}
        <span className="hidden text-xl xl:inline">{open ? "Less" : "More"}</span>
      </button>
      <div
        id="desktop-more-navigation"
        className={`grid transition-[grid-template-rows,opacity,transform] duration-180 motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100 translate-y-0" : "grid-rows-[0fr] opacity-0 -translate-y-1"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-1 max-h-[40vh] space-y-1 overflow-y-auto overscroll-contain pl-2 pr-1 [scrollbar-width:thin]">
            {items.map(({ href, label, Icon }) => {
              const active = isActive(pathname, href.split("?")[0]);
              return (
                <Link key={href} href={href} className={`flex h-10 items-center justify-center gap-3 rounded-full text-sm transition hover:bg-[var(--color-primary-soft)] xl:w-fit xl:justify-start xl:px-4 ${active ? "font-black" : "font-semibold text-[var(--color-text-secondary)]"}`}>
                  <Icon aria-hidden className="h-4.5 w-4.5" />
                  <span className="hidden xl:inline">{label}</span>
                </Link>
              );
            })}
            {user ? (
              <form action="/api/auth/sign-out" method="post">
                <button className="flex h-10 w-full items-center justify-center gap-3 rounded-full text-sm font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-primary-soft)] xl:w-fit xl:justify-start xl:px-4"><LogOut aria-hidden className="h-4.5 w-4.5" /><span className="hidden xl:inline">Sign out</span></button>
              </form>
            ) : (
              <Link href="/auth/sign-in" className={`flex h-10 items-center justify-center gap-3 rounded-full text-sm transition hover:bg-[var(--color-primary-soft)] xl:w-fit xl:justify-start xl:px-4 ${isActive(pathname, "/auth/sign-in") ? "font-black" : "font-semibold text-[var(--color-text-secondary)]"}`}><LogIn aria-hidden className="h-4.5 w-4.5" /><span className="hidden xl:inline">Sign in</span></Link>
            )}
          </div>
        </div>
      </div>
    </div>
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
                    <span className="flex items-center gap-1 truncate text-sm font-bold">{store.business_name}{store.is_verified ? <VerifiedBusinessBadge className="h-3.5 w-3.5" /> : null}</span>
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
