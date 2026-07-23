import Link from "next/link";
import type { User } from "@/types/storefront";

const nav = [
  ["Home", "/", "⌂"],
  ["Categories", "/categories", "▦"],
  ["Search", "/search", "⌕"],
  ["Saved", "/saved", "♡"],
  ["Cart", "/cart", "◴"],
] as const;

export function Header({ user }: { user: User | null }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-[58px] items-center justify-between border-b border-black/10 bg-white/90 px-4 backdrop-blur md:hidden">
      <Link href="/" className="text-xl font-black text-[#5b2cff]">eShop</Link>
      <div className="flex items-center gap-3">
        <Link aria-label="Notifications" href="/profile" className="grid h-9 w-9 place-items-center rounded-full bg-[#f0edff]">◌</Link>
        <Link aria-label="Profile" href={user ? "/profile" : "/auth/sign-in"} className="grid h-9 w-9 place-items-center rounded-full bg-[#5b2cff] text-sm font-bold text-white">
          {user ? user.username.slice(0, 1).toUpperCase() : "?"}
        </Link>
      </div>
    </header>
  );
}

export function LeftNav({ user, canPost }: { user: User | null; canPost: boolean }) {
  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen border-r border-black/10 bg-white md:block md:w-[78px] xl:w-[250px]">
      <div className="flex h-full flex-col gap-2 p-3">
        <Link href="/" className="mb-4 hidden px-3 text-2xl font-black text-[#5b2cff] xl:block">eShop</Link>
        {nav.map(([label, href, icon]) => (
          <Link key={href} href={href} className="flex h-12 items-center justify-center gap-3 rounded-lg text-lg hover:bg-[#f0edff] xl:justify-start xl:px-4">
            <span aria-hidden>{icon}</span><span className="hidden text-base font-semibold xl:inline">{label}</span>
          </Link>
        ))}
        {canPost && <Link href="/post/product" className="mt-3 rounded-lg bg-[#5b2cff] px-4 py-3 text-center font-bold text-white md:h-12 md:w-12 md:p-0 md:leading-[48px] xl:h-auto xl:w-auto xl:py-3 xl:leading-normal">+<span className="hidden xl:inline"> Post product</span></Link>}
        <Link href={user ? "/profile" : "/auth/sign-in"} className="mt-auto rounded-lg px-4 py-3 hover:bg-[#f0edff]">{user ? user.username : "Sign in"}</Link>
      </div>
    </aside>
  );
}

export function BottomNav({ canPost }: { canPost: boolean }) {
  return (
    <>
      {canPost && <Link aria-label="Post product" href="/post/product" className="fixed bottom-[calc(78px+env(safe-area-inset-bottom))] right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#5b2cff] text-3xl font-bold text-white shadow-xl md:hidden">+</Link>}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[76px] grid-cols-5 border-t border-black/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {nav.map(([label, href, icon]) => <Link key={href} href={href} className="flex flex-col items-center justify-center gap-1 text-xs font-semibold"><span className="text-xl">{icon}</span>{label}</Link>)}
      </nav>
    </>
  );
}

export function RightRail() {
  return (
    <aside className="fixed right-0 top-0 z-20 hidden h-screen w-[310px] border-l border-black/10 bg-white/75 p-5 backdrop-blur xl:block">
      <div className="rounded-lg border border-black/10 bg-white p-4">
        <h2 className="font-bold">Shopping context</h2>
        <p className="mt-2 text-sm text-black/60">Trending stores, viewed products, and cart summary are ready to be expanded from storefront activity.</p>
      </div>
    </aside>
  );
}
