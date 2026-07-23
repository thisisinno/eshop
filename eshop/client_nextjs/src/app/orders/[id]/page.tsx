import Image from "next/image";
import { serverGet } from "@/lib/api/django";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import type { OrderDetail } from "@/types/storefront";

const money = (amount: string, currency: string) => `${currency} ${Number(amount).toLocaleString()}`;
const label = (value: string) => value.replaceAll("_", " ");

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await serverGet<OrderDetail>(`/storefront/orders/mine/${id}/`);
  return (
    <section>
      <div className="border-b border-[var(--color-border)] p-4">
        <h1 className="text-2xl font-black">{order.order_number}</h1>
        <p className="mt-2 font-bold">{money(order.total_amount, order.currency)}</p>
        <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">Order {label(order.status)} · Payment {label(order.payment_status)}</p>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {order.items.map((item) => {
          const image = resolveMediaUrl(item.product_media_url);
          return (
            <article key={item.id} className="grid grid-cols-[112px_1fr] gap-3 p-4">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[var(--color-primary-soft)]">{image ? <Image src={image} alt={item.product_name_snapshot} fill sizes="112px" className="object-cover" /> : null}</div>
              <div>
                <h2 className="line-clamp-2 font-black">{item.product_name_snapshot}</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{item.trader_name_snapshot}</p>
                <p className="mt-2 text-sm font-semibold">Qty {item.quantity} · {money(item.line_total, order.currency)}</p>
              </div>
            </article>
          );
        })}
      </div>
      <div className="border-t border-[var(--color-border)] p-4 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><b>{money(order.subtotal_amount, order.currency)}</b></div>
        <div className="mt-2 flex justify-between text-[var(--color-text-secondary)]"><span>Delivery</span><span>{money(order.delivery_fee, order.currency)}</span></div>
        <div className="mt-3 flex justify-between text-base"><span>Total</span><b>{money(order.total_amount, order.currency)}</b></div>
      </div>
      <div className="border-t border-[var(--color-border)] p-4">
        <h2 className="font-black">Delivery</h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{[order.customer_region, order.customer_district, order.customer_ward, order.customer_street].filter(Boolean).join(", ") || "No location details provided."}</p>
        {order.customer_address ? <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{order.customer_address}</p> : null}
        {order.delivery_note ? <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{order.delivery_note}</p> : null}
      </div>
      <div className="border-t border-[var(--color-border)] p-4">
        <h2 className="font-black">Timeline</h2>
        <ol className="mt-3 space-y-3">
          {order.status_history.map((item) => <li key={item.id} className="border-l border-[var(--color-border-strong)] pl-3 text-sm"><b className="capitalize">{label(item.to_status)}</b><p className="text-[var(--color-text-secondary)]">{new Date(item.created_at).toLocaleString()}</p>{item.note ? <p className="text-[var(--color-text-secondary)]">{item.note}</p> : null}</li>)}
        </ol>
      </div>
    </section>
  );
}
