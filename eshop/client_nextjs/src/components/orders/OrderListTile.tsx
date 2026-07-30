"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Eye, Loader2, MessageCircle } from "lucide-react";
import type { OrderListItem } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import { useRouteFeedback } from "@/hooks/useRouteFeedback";
import { ListTile, listTileMainClass } from "@/components/ui/ListTile";

const money = (amount: string, currency: string) => `${currency} ${Number(amount).toLocaleString()}`;
const label = (value: string) => value.replaceAll("_", " ");

function Action({ href, labelText, kind, badge }: { href: string; labelText: string; kind: "chat" | "details"; badge?: number }) {
  const feedback = useRouteFeedback(href);
  const Icon = feedback.loading ? Loader2 : feedback.complete ? Check : kind === "chat" ? MessageCircle : Eye;
  return <Link href={href} onClick={feedback.onClick} aria-label={labelText}
    aria-busy={feedback.loading || undefined}
    className="relative grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border-strong)] transition duration-180 hover:bg-white active:scale-[.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-black motion-reduce:transition-none motion-reduce:active:scale-100">
    <Icon aria-hidden className={`h-5 w-5 ${feedback.loading ? "animate-spin motion-reduce:animate-none" : ""}`} />
    {badge ? <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[10px] font-black text-white">{badge > 9 ? "9+" : badge}</span> : null}
  </Link>;
}

export function OrderListTile({ order, created }: { order: OrderListItem; created: boolean }) {
  const preview = order.preview_items[0];
  const image = resolveMediaUrl(preview?.product_media_url);
  const href = `/orders/${order.id}`;
  const mainFeedback = useRouteFeedback(href);
  return <ListTile className={`grid grid-cols-[minmax(0,1fr)_44px_44px] items-center gap-1 px-2 py-2 sm:gap-2 sm:px-4 ${created ? "!bg-[var(--color-primary-soft)]" : ""}`}>
    <Link href={href} onClick={mainFeedback.onClick} aria-label={`View ${order.order_number} details`} title={order.order_number} className={`${listTileMainClass} grid min-w-0 grid-cols-[56px_minmax(0,1fr)] items-center gap-2 py-1 sm:grid-cols-[64px_minmax(0,1fr)] sm:gap-3`}>
      <span className="relative h-14 w-14 overflow-hidden rounded-lg bg-[var(--color-primary-soft)] sm:h-16 sm:w-16">
        {image ? <Image src={image} alt="" fill sizes="64px" className="object-cover" /> : <span className="grid h-full place-items-center text-xs font-bold text-[var(--color-text-secondary)]">No image</span>}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-black sm:text-[15px]">{order.order_number}</span>
        <span className="mt-0.5 block truncate text-xs text-[var(--color-text-secondary)]">{order.total_quantity} {order.total_quantity === 1 ? "item" : "items"} · {money(order.total_amount, order.currency)}</span>
        <span className="mt-0.5 block truncate text-[11px] font-bold capitalize sm:text-xs">Order {label(order.status)} · Payment {label(order.payment_status)}</span>
        {order.chat?.latest_message_preview ? <span className="mt-0.5 block truncate text-[11px] text-[var(--color-text-secondary)]">{order.chat.latest_message_preview}</span> : null}
        {order.chat?.latest_message_at ? <time className="block truncate text-[10px] text-[var(--color-text-secondary)]">{new Date(order.chat.latest_message_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time> : null}
      </span>
    </Link>
    <Action href={`/orders/${order.id}/chat`} labelText={`Open chat for ${order.order_number}`} kind="chat" badge={order.chat?.unread_count} />
    <Action href={href} labelText={`View ${order.order_number} details`} kind="details" />
  </ListTile>;
}
