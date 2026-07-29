"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Eye, Loader2, MessageCircle } from "lucide-react";
import type { OrderListItem } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import { useRouteFeedback } from "@/hooks/useRouteFeedback";

const money = (amount: string, currency: string) => `${currency} ${Number(amount).toLocaleString()}`;
const label = (value: string) => value.replaceAll("_", " ");

function Action({ href, labelText, kind, badge }: { href: string; labelText: string; kind: "chat" | "details"; badge?: number }) {
  const feedback = useRouteFeedback(href);
  const Icon = feedback.loading ? Loader2 : feedback.complete ? Check : kind === "chat" ? MessageCircle : Eye;
  return <Link href={href} onClick={feedback.onClick} aria-label={labelText}
    className="relative grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border-strong)] transition hover:bg-[var(--color-primary-soft)] active:scale-[.97]">
    <Icon aria-hidden className={`h-5 w-5 ${feedback.loading ? "animate-spin" : ""}`} />
    {badge ? <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[10px] font-black text-white">{badge > 9 ? "9+" : badge}</span> : null}
  </Link>;
}

export function OrderListTile({ order, created }: { order: OrderListItem; created: boolean }) {
  const preview = order.preview_items[0];
  const image = resolveMediaUrl(preview?.product_media_url);
  return <article className={`grid grid-cols-[88px_minmax(0,1fr)] gap-3 bg-white p-4 ${created ? "bg-[var(--color-primary-soft)]" : ""}`}>
    <div className="relative aspect-square overflow-hidden rounded-xl bg-[var(--color-primary-soft)]">
      {image ? <Image src={image} alt={preview.product_name} fill sizes="88px" className="object-cover" /> : null}
    </div>
    <div className="min-w-0">
      <h2 className="truncate font-black">{order.order_number}</h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{order.total_quantity} items · {money(order.total_amount, order.currency)}</p>
      <p className="mt-1 text-xs font-bold capitalize">{label(order.status)}</p>
      {order.chat?.latest_message_preview ? <p className="mt-2 truncate text-xs text-[var(--color-text-secondary)]">{order.chat.latest_message_preview}</p> : null}
      <div className="mt-3 flex items-center justify-end gap-2">
        {order.chat?.latest_message_at ? <time className="mr-auto text-[11px] text-[var(--color-text-secondary)]">{new Date(order.chat.latest_message_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time> : <span className="mr-auto" />}
        <Action href={`/orders/${order.id}/chat`} labelText={`Chat about ${order.order_number}`} kind="chat" badge={order.chat?.unread_count} />
        <Action href={`/orders/${order.id}`} labelText={`View ${order.order_number} details`} kind="details" />
      </div>
    </div>
  </article>;
}
