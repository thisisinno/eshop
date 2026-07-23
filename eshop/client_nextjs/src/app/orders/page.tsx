import { serverGet } from "@/lib/api/django";
import { getCurrentUser } from "@/lib/auth/session";
import Link from "next/link";

type Order = { id: number; order_number: string; total_amount: string; currency: string; status: string; created_at: string };

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) return <Link href="/auth/sign-in">Sign in to view orders</Link>;
  const orders = await serverGet<Order[]>("/storefront/orders/mine/");
  return <section><h1 className="mb-4 text-2xl font-black">Orders</h1>{orders.map((order) => <Link key={order.id} href={`/orders/${order.id}`} className="mb-3 block rounded-lg bg-white p-4"><b>{order.order_number}</b><p className="text-sm text-black/60">{order.status} · {order.currency} {Number(order.total_amount).toLocaleString()}</p></Link>)}</section>;
}
