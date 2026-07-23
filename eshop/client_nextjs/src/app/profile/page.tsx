import { getCurrentUser } from "@/lib/auth/session";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Check, LogOut, Package, Settings, Store } from "lucide-react";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return <ButtonLink href="/auth/sign-in">Sign in</ButtonLink>;
  const rows = [
    { href: "/orders", label: "Orders", Icon: Package },
    { href: "/saved", label: "My List", Icon: Check },
    { href: "/search?tab=stores", label: "Followed stores", Icon: Store },
    { href: "/profile", label: "Settings", Icon: Settings },
  ];
  return (
    <section>
      <div className="border-b border-[var(--color-border)] p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--color-primary-soft)] text-xl font-black">{(user.first_name?.[0] || user.username[0]).toUpperCase()}</div>
          <div>
            <h1 className="text-2xl font-black">{user.first_name || user.username}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{user.email}</p>
            {user.is_staff ? <p className="mt-2 text-xs font-bold text-[var(--color-text)]">Admin account</p> : null}
          </div>
        </div>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {rows.map(({ href, label, Icon }) => <Link key={label} href={href} className="flex min-h-14 items-center gap-3 px-4 font-semibold transition hover:bg-[var(--color-primary-soft)]"><Icon aria-hidden className="h-5 w-5 text-[var(--color-text)]" />{label}</Link>)}
      </div>
      <form action="/api/auth/sign-out" method="post" className="p-4">
        <button className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--color-black)] px-4 text-sm font-semibold text-white transition active:scale-[0.98]"><LogOut aria-hidden className="h-4 w-4" />Sign out</button>
      </form>
    </section>
  );
}
