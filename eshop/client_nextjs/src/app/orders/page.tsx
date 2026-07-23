import { serverGet } from "@/lib/api/django";
import { getCurrentUser } from "@/lib/auth/session";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

type Order = { id: number; order_number: string; total_amount: string; currency: string; status: string; created_at: string };

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) return <EmptyState title="Sign in to view orders" action={<ButtonLink href="/auth/sign-in">Sign in</ButtonLink>} />;
  const orders = await serverGet<Order[]>("/storefront/orders/mine/");
  return <section><h1 className="mb-4 text-2xl font-black md:text-3xl">Orders</h1>{orders.length ? orders.map((order) => <Link key={order.id} href={`/orders/${order.id}`} className="mb-3 block rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm transition hover:bg-slate-50"><b>{order.order_number}</b><p className="text-sm text-[var(--color-text-secondary)]">{order.status} · {order.currency} {Number(order.total_amount).toLocaleString()}</p></Link>) : <Card className="p-5 text-sm text-[var(--color-text-secondary)]">No orders yet.</Card>}</section>;
}
