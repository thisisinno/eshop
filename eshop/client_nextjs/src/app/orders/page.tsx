import { serverGet } from "@/lib/api/django";
import { getCurrentUser } from "@/lib/auth/session";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import type { OrderListItem } from "@/types/storefront";

const money = (amount: string, currency: string) => `${currency} ${Number(amount).toLocaleString()}`;
const label = (value: string) => value.replaceAll("_", " ");

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const { created } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return <EmptyState title="Sign in to view orders" action={<ButtonLink href="/auth/sign-in">Sign in</ButtonLink>} />;
  const orders = await serverGet<OrderListItem[]>("/storefront/orders/mine/");
  return <section><div className="border-b border-[var(--color-border)] px-4 py-4"><h1 className="text-2xl font-black md:text-3xl">Orders</h1></div>{orders.length ? <div className="divide-y divide-[var(--color-border)]">{orders.map((order) => <OrderCard key={order.id} order={order} created={created === String(order.id)} />)}</div> : <EmptyState title="No orders yet" action={<ButtonLink href="/search">Find products</ButtonLink>}>Submitted orders will appear here with product previews.</EmptyState>}</section>;
}

function OrderCard({ order, created }: { order: OrderListItem; created: boolean }) {
  const previews = order.preview_items.slice(0, 2);
  return (
    <Link href={`/orders/${order.id}`} className={`grid grid-cols-[124px_1fr] gap-3 bg-white p-4 transition hover:bg-[var(--color-primary-soft)] active:scale-[0.99] ${created ? "bg-[var(--color-primary-soft)]" : ""}`}>
      <div className="grid aspect-[4/3] grid-cols-2 gap-1 overflow-hidden rounded-lg bg-[var(--color-primary-soft)]">
        {previews.length ? previews.map((item, index) => {
          const image = resolveMediaUrl(item.product_media_url);
          return <span key={`${item.product_name}-${index}`} className={`relative overflow-hidden ${previews.length === 1 ? "col-span-2" : ""}`}>{image ? <Image src={image} alt={item.product_name} fill sizes="124px" className="object-cover" /> : null}</span>;
        }) : null}
      </div>
      <div className="min-w-0">
        {created ? <p className="mb-1 text-xs font-black uppercase">Order submitted</p> : null}
        <h2 className="truncate font-black">{order.order_number}</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{new Date(order.created_at).toLocaleDateString()} · {order.total_quantity} items</p>
        <p className="mt-2 font-black">{money(order.total_amount, order.currency)}</p>
        <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">Order {label(order.status)} · Payment {label(order.payment_status)}</p>
      </div>
    </Link>
  );
}
