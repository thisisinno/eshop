import { serverGet } from "@/lib/api/django";

type OrderDetail = { order_number: string; total_amount: string; currency: string; status: string; items: { id: number; product_name_snapshot: string; quantity: number; line_total: string }[] };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await serverGet<OrderDetail>(`/storefront/orders/mine/${id}/`);
  return <section><div className="border-b border-[var(--color-border)] p-4"><h1 className="text-2xl font-black">{order.order_number}</h1><p className="mt-2 font-bold">{order.status} · {order.currency} {Number(order.total_amount).toLocaleString()}</p></div><div className="divide-y divide-[var(--color-border)]">{order.items.map((item) => <p key={item.id} className="p-4 text-sm">{item.product_name_snapshot} x {item.quantity}</p>)}</div></section>;
}
