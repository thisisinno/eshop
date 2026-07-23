import { getCurrentUser } from "@/lib/auth/session";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heart, LogOut, Package, Settings, Store } from "lucide-react";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return <ButtonLink href="/auth/sign-in">Sign in</ButtonLink>;
  const rows = [
    { href: "/orders", label: "Orders", Icon: Package },
    { href: "/saved", label: "Saved", Icon: Heart },
    { href: "/search?tab=stores", label: "Followed stores", Icon: Store },
    { href: "/profile", label: "Settings", Icon: Settings },
  ];
  return (
    <section className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-xl font-black">{(user.first_name?.[0] || user.username[0]).toUpperCase()}</div>
          <div>
            <h1 className="text-2xl font-black">{user.first_name || user.username}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{user.email}</p>
            {user.is_staff ? <Badge className="mt-2">Admin account</Badge> : null}
          </div>
        </div>
      </Card>
      <Card className="divide-y divide-[var(--color-border)] overflow-hidden">
        {rows.map(({ href, label, Icon }) => <Link key={label} href={href} className="flex min-h-14 items-center gap-3 px-4 font-semibold transition hover:bg-slate-50"><Icon aria-hidden className="h-5 w-5 text-[var(--color-primary)]" />{label}</Link>)}
      </Card>
      <form action="/api/auth/sign-out" method="post">
        <button className="inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--color-black)] px-4 text-sm font-semibold text-white transition hover:bg-black/85 active:scale-[0.98]"><LogOut aria-hidden className="h-4 w-4" />Sign out</button>
      </form>
    </section>
  );
}
