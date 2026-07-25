"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Bell,
  Bookmark,
  Check,
  Ellipsis,
  Home,
  LogIn,
  LogOut,
  Loader2,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Store,
  User as UserIcon,
  X,
} from "lucide-react";
import type { Cart, ProductCard, SiteBranding, StoreSummary, User } from "@/types/storefront";
import { useMyList } from "@/components/bookmarks/MyListProvider";
import { useCart } from "@/components/cart/CartProvider";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import { VerifiedBusinessBadge } from "@/components/store/VerifiedBusinessBadge";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import { BrandLogo } from "./BrandLogo";

const primaryNav = [
  { label: "Home", href: "/", Icon: Home },
  { label: "Search", href: "/search", Icon: Search },
  { label: "My List", href: "/saved", Icon: Bookmark },
  { label: "Notifications", href: "/notifications", Icon: Bell },
  { label: "Cart", href: "/cart", Icon: ShoppingBag },
] as const;

const mobileNav = [
  { label: "Home", href: "/", Icon: Home },
  { label: "My List", href: "/saved", Icon: Bookmark },
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

function NavigationAction({
  href, label, Icon, count = 0, className = "", iconClassName = "h-5 w-5", showLabel = false,
  labelClassName = "text-[10px] leading-none", onNavigate,
}: {
  href: string; label: string; Icon: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  count?: number; className?: string; iconClassName?: string; showLabel?: boolean; labelClassName?: string; onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [requested, setRequested] = useState(false);
  const [complete, setComplete] = useState(false);
  const [targetPath, targetQuery] = href.split("?");
  const active = isActive(pathname, targetPath)
    && (targetQuery
      ? Array.from(new URLSearchParams(targetQuery)).every(([key, value]) => searchParams.get(key) === value)
      : !(targetPath === "/search" && searchParams.get("tab") === "stores"));

  useEffect(() => {
    if (!requested || !active) return;
    const confirmation = window.setTimeout(() => {
      setRequested(false);
      setComplete(true);
    }, 0);
    return () => window.clearTimeout(confirmation);
  }, [active, requested]);

  useEffect(() => {
    if (!complete) return;
    const reset = window.setTimeout(() => setComplete(false), 2000);
    return () => window.clearTimeout(reset);
  }, [complete]);

  useEffect(() => {
    if (active) return;
    const reset = window.setTimeout(() => setComplete(false), 0);
    return () => window.clearTimeout(reset);
  }, [active]);

  useEffect(() => {
    if (!requested) return;
    const failSafe = window.setTimeout(() => setRequested(false), 10000);
    return () => window.clearTimeout(failSafe);
  }, [requested]);

  function navigate(event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (active || requested) return;
    event.preventDefault();
    setRequested(true);
    onNavigate?.();
    startTransition(() => router.push(href));
  }

  const feedback = requested || isPending
    ? <Loader2 aria-hidden className={`${iconClassName} animate-spin motion-reduce:animate-none`} />
    : complete
      ? <Check aria-hidden className={iconClassName} strokeWidth={2.8} />
      : <Icon aria-hidden className={iconClassName} strokeWidth={active ? 2.7 : 2.1} />;
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      aria-busy={requested || isPending || undefined}
      onClick={navigate}
      className={`navigation-action ${active ? "bg-[var(--color-primary-soft)] font-black text-[var(--color-text)]" : "font-semibold text-[var(--color-text-secondary)]"} ${className}`}
    >
      {count > 0 ? <IconWithBadge count={count}>{feedback}</IconWithBadge> : feedback}
      {showLabel ? <span className={`max-w-full truncate ${labelClassName}`}>{label}</span> : null}
    </Link>
  );
}

function CartLink() {
  const { count } = useCart();
  return <NavigationAction href="/cart" label="Cart" Icon={ShoppingBag} count={count} className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-[var(--color-primary-soft)]" />;
}

export function Header({ branding, user }: { branding: SiteBranding; user: User | null }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-[58px] items-center justify-between border-b border-[var(--color-border)] bg-white/95 px-4 backdrop-blur md:hidden">
      <BrandLogo branding={branding} user={user} className="h-10 w-10" />
      <div className="pointer-events-none absolute left-1/2 max-w-[calc(100vw-152px)] -translate-x-1/2 truncate text-base font-black text-[var(--color-text)]">
        {branding.site_name || "eShop"}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <NavigationAction href="/search" label="Search" Icon={Search} className="grid h-10 w-10 place-items-center rounded-full hover:bg-[var(--color-primary-soft)]" />
        <CartLink />
      </div>
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
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[var(--desktop-nav-width)] bg-white md:block">
      <div className="flex h-full min-h-0 w-full flex-col gap-2 border-r border-[var(--color-border)] px-2 py-3">
        <div className="mb-2 flex h-12 shrink-0 items-center justify-center">
          <BrandLogo branding={branding} user={user} className="h-12 w-12" />
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
        {primaryNav.map(({ label, href, Icon }) => {
          const count = label === "Notifications" ? unreadCount : label === "My List" ? myListCount : label === "Cart" ? cartCount : 0;
          return <NavigationAction key={href} href={href} label={label} Icon={Icon} count={count} showLabel labelClassName="text-xs leading-tight" iconClassName="h-5.5 w-5.5 shrink-0" className="relative flex min-h-12 w-full items-center justify-start gap-2 rounded-xl px-3 hover:bg-[var(--color-primary-soft)]" />;
        })}
        <DesktopMoreNavigation user={user} canPost={canPost} pathname={pathname} />
        </nav>
        <Link href={user ? "/profile" : "/auth/sign-in"} aria-label={user ? "Profile" : "Sign in"} title={user ? "Profile" : "Sign in"} className="flex min-h-12 shrink-0 items-center justify-center rounded-full p-1 text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-primary-soft)] text-sm font-black">{initials(user) || <UserIcon aria-hidden className="h-5 w-5" />}</span>
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
          const count = label === "Notifications" ? unreadCount : label === "My List" ? myListCount : 0;
          return <NavigationAction key={href} href={href} label={label} Icon={Icon} count={count} showLabel labelClassName="text-xs leading-none" className="relative flex min-h-11 flex-col items-center justify-center gap-1 text-xs" />;
        })}
        <MoreMenuButton user={user} canPost={canPost} className="relative flex min-h-11 flex-col items-center justify-center gap-1 text-xs font-semibold text-[var(--color-text-secondary)] transition active:scale-[0.97]" labelClassName="text-xs" />
      </nav>
    </>
  );
}

function DesktopMoreNavigation({ user, canPost, pathname }: { user: User | null; canPost: boolean; pathname: string }) {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();
  const items = useMemo(() => moreItems(canPost).filter((item) => item.href !== "/search"), [canPost]);
  const moreActive = items.some((item) => {
    const [itemPath, itemQuery] = item.href.split("?");
    return isActive(pathname, itemPath)
      && (!itemQuery || Array.from(new URLSearchParams(itemQuery)).every(([key, value]) => searchParams.get(key) === value));
  });
  return (
    <div className="min-h-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="desktop-more-navigation"
        aria-label={open ? "Collapse more navigation" : "Expand more navigation"}
        onClick={() => setOpen((value) => !value)}
        title={open ? "Close More" : "More"}
        className={`navigation-action flex min-h-12 w-full items-center justify-start gap-2 rounded-xl px-3 text-[var(--color-text)] hover:bg-[var(--color-primary-soft)] ${open || moreActive ? "bg-[var(--color-primary-soft)] font-black" : "font-semibold text-[var(--color-text-secondary)]"}`}
      >
        <Ellipsis aria-hidden className="h-5.5 w-5.5" strokeWidth={open ? 2.7 : 2.2} />
        <span className="text-xs leading-tight">More</span>
      </button>
      <div
        id="desktop-more-navigation"
        className={`grid transition-[grid-template-rows,opacity] duration-180 motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="space-y-1 pt-1">
            {items.map(({ href, label, Icon }) => {
              return (
                <NavigationAction key={href} href={href} label={label} Icon={Icon} showLabel labelClassName="text-xs leading-tight" iconClassName="h-4.5 w-4.5 shrink-0" className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 hover:bg-[var(--color-primary-soft)]" />
              );
            })}
            {user ? (
              <form action="/api/auth/sign-out" method="post">
                <button className="navigation-action flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-soft)]"><LogOut aria-hidden className="h-4.5 w-4.5" />Sign out</button>
              </form>
            ) : (
              <NavigationAction href="/auth/sign-in" label="Sign in" Icon={LogIn} showLabel labelClassName="text-xs leading-tight" iconClassName="h-4.5 w-4.5 shrink-0" className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 hover:bg-[var(--color-primary-soft)]" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MoreSheet({ open, onClose, user, canPost }: { open: boolean; onClose: () => void; user: User | null; canPost: boolean }) {
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
            <NavigationAction key={href} href={href} label={label} Icon={Icon} showLabel labelClassName="text-sm leading-tight" onNavigate={onClose} className="flex min-h-12 w-full items-center gap-4 py-2 text-left hover:bg-[var(--color-primary-soft)]" />
          ))}
          {user ? (
            <form action="/api/auth/sign-out" method="post">
              <button className="flex min-h-12 w-full items-center gap-4 py-2 text-left font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]"><LogOut aria-hidden className="h-5 w-5" />Sign out</button>
            </form>
          ) : (
            <NavigationAction href="/auth/sign-in" label="Sign in" Icon={LogIn} showLabel labelClassName="text-sm leading-tight" onNavigate={onClose} className="flex min-h-12 w-full items-center gap-4 py-2 text-left hover:bg-[var(--color-primary-soft)]" />
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
