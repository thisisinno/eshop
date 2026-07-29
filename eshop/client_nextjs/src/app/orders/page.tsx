import { OrdersListClient } from "@/components/orders/OrdersListClient";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { serverGet } from "@/lib/api/django";
import { getCurrentUser } from "@/lib/auth/session";
import type { OrderListItem } from "@/types/storefront";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const { created } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return <EmptyState title="Sign in to view orders" action={<ButtonLink href="/auth/sign-in">Sign in</ButtonLink>} />;
  const orders = await serverGet<OrderListItem[]>("/storefront/orders/mine/");
  return (
    <section>
      <div className="border-b border-[var(--color-border)] px-4 py-4">
        <h1 className="text-2xl font-black md:text-3xl">Orders</h1>
      </div>
      {orders.length ? <OrdersListClient initialOrders={orders} createdId={created ? Number(created) : null} /> :
        <EmptyState title="No orders yet" action={<ButtonLink href="/search">Find products</ButtonLink>}>Submitted orders will appear here.</EmptyState>}
    </section>
  );
}
