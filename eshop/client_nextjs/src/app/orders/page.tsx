import { serverGet } from "@/lib/api/django";
import { getCurrentUser } from "@/lib/auth/session";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

type Order = { id: number; order_number: string; total_amount: string; currency: string; status: string; created_at: string };

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) return <EmptyState title="Sign in to view orders" action={<ButtonLink href="/auth/sign-in">Sign in</ButtonLink>} />;
  const orders = await serverGet<Order[]>("/storefront/orders/mine/");
  return <section><div className="border-b border-[var(--color-border)] px-4 py-4"><h1 className="text-2xl font-black md:text-3xl">Orders</h1></div>{orders.length ? <div className="divide-y divide-[var(--color-border)]">{orders.map((order) => <Link key={order.id} href={`/orders/${order.id}`} className="block bg-white p-4 transition hover:bg-[var(--color-primary-soft)]"><b>{order.order_number}</b><p className="text-sm text-[var(--color-text-secondary)]">{order.status} · {order.currency} {Number(order.total_amount).toLocaleString()}</p></Link>)}</div> : <p className="p-5 text-sm text-[var(--color-text-secondary)]">No orders yet.</p>}</section>;
}
