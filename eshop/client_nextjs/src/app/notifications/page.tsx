import Link from "next/link";
import { NotificationsClient } from "@/components/notifications/NotificationsClient";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { serverGet } from "@/lib/api/django";
import { getCurrentUser } from "@/lib/auth/session";
import type { Paginated, StorefrontNotification } from "@/types/storefront";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams;
  const tab = tabParam === "completed" ? "completed" : "pending";
  const user = await getCurrentUser();
  if (!user) return <EmptyState title="Sign in to view notifications" action={<ButtonLink href="/auth/sign-in">Sign in</ButtonLink>}>Notifications are private to your account.</EmptyState>;
  const data = await serverGet<Paginated<StorefrontNotification>>(`/storefront/notifications/?state=${tab}`).catch(() => ({ results: [], count: 0, page: 1, page_size: 24, total_pages: 1, next: null, previous: null }));
  return (
    <section>
      <div className="sticky top-[58px] z-20 bg-white/95 backdrop-blur md:top-0">
        <div className="border-b border-[var(--color-border)] px-4 py-4">
          <h1 className="text-2xl font-black">Notifications</h1>
        </div>
        <div className="grid grid-cols-2 border-b border-[var(--color-border)] text-sm font-bold">
          <Tab href="/notifications?tab=pending" active={tab === "pending"}>Pending</Tab>
          <Tab href="/notifications?tab=completed" active={tab === "completed"}>Completed</Tab>
        </div>
      </div>
      <NotificationsClient key={`${tab}:${data.results.map((item) => item.id).join(",")}`} initial={data.results} tab={tab} />
    </section>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} className={`relative py-4 text-center transition hover:bg-[var(--color-primary-soft)] ${active ? "text-[var(--color-text)]" : "text-[var(--color-text-secondary)]"}`}>{active ? <span className="absolute bottom-0 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-[var(--color-black)]" /> : null}{children}</Link>;
}
