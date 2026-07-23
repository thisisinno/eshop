"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Bookmark, Check, Package, ShoppingBag, X } from "lucide-react";
import type { StorefrontNotification } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import { useNotifications } from "./NotificationProvider";

const label = (value: string) => value.replaceAll("_", " ");

export function NotificationsClient({ initial, tab }: { initial: StorefrontNotification[]; tab: "pending" | "completed" }) {
  const router = useRouter();
  const { decrementUnread, refreshUnreadCount } = useNotifications();
  const [items, setItems] = useState(initial);
  const [selected, setSelected] = useState<StorefrontNotification | null>(null);

  async function open(notification: StorefrontNotification) {
    setSelected(notification);
    if (!notification.is_read) {
      const response = await fetch(`/api/storefront/notifications/${notification.id}/read/`, { method: "PATCH" });
      if (response.ok) {
        const updated = await response.json() as StorefrontNotification;
        setSelected(updated);
        setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
        decrementUnread();
        void refreshUnreadCount();
        router.refresh();
      }
    }
  }

  return (
    <>
      <div className="divide-y divide-[var(--color-border)]">
        {items.map((item) => <NotificationRow key={item.id} notification={item} onOpen={() => void open(item)} />)}
        {!items.length ? <div className="px-4 py-16 text-center"><h2 className="text-xl font-black">Nothing here yet.</h2><p className="mt-2 text-sm text-[var(--color-text-secondary)]">{tab === "pending" ? "Active order updates will appear here." : "Completed updates and action receipts will appear here."}</p></div> : null}
      </div>
      <NotificationDetailDrawer notification={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function NotificationRow({ notification, onOpen }: { notification: StorefrontNotification; onOpen: () => void }) {
  const image = resolveMediaUrl(notification.product?.primary_media_url || notification.store?.logo_url || "");
  const Icon = notification.notification_type === "order" ? Package : notification.notification_type === "cart" ? ShoppingBag : notification.notification_type === "my_list" ? Bookmark : notification.is_read ? Check : Bell;
  const status = notification.lifecycle_state === "pending" ? "In progress" : "Completed";
  const time = new Date(notification.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return (
    <button type="button" onClick={onOpen} className="grid w-full grid-cols-[42px_minmax(0,1fr)_12px] gap-3 bg-white px-4 py-3 text-left transition hover:bg-[var(--color-primary-soft)] active:scale-[0.99]">
      <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-[var(--color-primary-soft)]">
        {image ? <Image src={image} alt="" fill sizes="40px" className="object-cover" /> : <Icon aria-hidden className="h-5 w-5" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-black">{notification.title}</span>
        <span className="line-clamp-2 text-sm text-[var(--color-text-secondary)]">{notification.message}</span>
        <span className="mt-1 block truncate text-xs font-semibold text-[var(--color-text-secondary)]">{status} · {time}</span>
      </span>
      <span className="flex items-start justify-end pt-1">
        {!notification.is_read ? <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-black)]" aria-label="Unread" /> : null}
      </span>
    </button>
  );
}

function NotificationDetailDrawer({ notification, onClose }: { notification: StorefrontNotification | null; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!notification) return;
    panelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [notification, onClose]);
  if (!notification) return null;
  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Notification detail">
      <button aria-label="Close notification detail" className="absolute inset-0 h-full w-full bg-black/20" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-2xl bg-white p-4 outline-none md:left-auto md:right-0 md:top-0 md:h-full md:w-[420px] md:rounded-none md:border-l md:border-[var(--color-border)]">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-xl font-black">{notification.title}</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{new Date(notification.created_at).toLocaleString()}</p></div>
          <button aria-label="Close" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-[var(--color-primary-soft)]"><X aria-hidden className="h-5 w-5" /></button>
        </div>
        <p className="mt-4 text-sm leading-6 text-[var(--color-text-secondary)]">{notification.message}</p>
        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between gap-4"><dt>State</dt><dd className="font-bold capitalize">{notification.lifecycle_state}</dd></div>
          <div className="flex justify-between gap-4"><dt>Read</dt><dd className="font-bold">{notification.is_read ? "Seen" : "Unread"}</dd></div>
          {notification.order ? <><div className="flex justify-between gap-4"><dt>Order</dt><dd className="font-bold">{notification.order.order_number}</dd></div><div className="flex justify-between gap-4"><dt>Status</dt><dd className="font-bold capitalize">{label(notification.order.status)}</dd></div><div className="flex justify-between gap-4"><dt>Payment</dt><dd className="font-bold capitalize">{label(notification.order.payment_status)}</dd></div></> : null}
          {notification.activity ? <div className="flex justify-between gap-4"><dt>Activity</dt><dd className="font-bold capitalize">{label(notification.activity.action)}</dd></div> : null}
        </dl>
        <div className="mt-6 flex flex-wrap gap-2">
          {notification.product ? <Link href={`/products/${notification.product.id}`} className="rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-sm font-semibold hover:bg-[var(--color-primary-soft)]">View product</Link> : null}
          {notification.store ? <Link href={`/stores/${notification.store.slug}`} className="rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-sm font-semibold hover:bg-[var(--color-primary-soft)]">View store</Link> : null}
          {notification.order ? <Link href={`/orders/${notification.order.id}`} className="rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-sm font-semibold hover:bg-[var(--color-primary-soft)]">View order</Link> : null}
        </div>
      </div>
    </div>
  );
}
