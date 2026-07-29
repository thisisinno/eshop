"use client";

import { useEffect, useState } from "react";
import type { OrderListItem } from "@/types/storefront";
import type { RealtimeEvent } from "@/hooks/useRealtimeSocket";
import { OrderListTile } from "./OrderListTile";

export function OrdersListClient({ initialOrders, createdId }: { initialOrders: OrderListItem[]; createdId: number | null }) {
  const [orders, setOrders] = useState(initialOrders);
  useEffect(() => {
    const listener = (raw: Event) => {
      const event = (raw as CustomEvent<RealtimeEvent>).detail;
      const orderId = Number(event.order_id);
      if (!orderId) return;
      setOrders((current) => current.map((order) => {
        if (order.id !== orderId || !order.chat) return order;
        if (event.type === "chat.message.created") {
          const message = event.message as { body: string; created_at: string; sender_role: string };
          return { ...order, chat: { ...order.chat,
            latest_message_preview: message.body,
            latest_message_at: message.created_at,
            unread_count: message.sender_role === "admin" ? order.chat.unread_count + 1 : order.chat.unread_count,
          } };
        }
        if (event.type === "chat.status.changed" || event.type === "chat.assignment.changed") {
          return { ...order, chat: { ...order.chat,
            status: event.status as "requested" | "open" | "closed",
            assigned_admin_name: typeof event.assigned_admin_name === "string" ? event.assigned_admin_name : order.chat.assigned_admin_name,
          } };
        }
        return order;
      }));
    };
    window.addEventListener("smartwear:realtime", listener);
    return () => window.removeEventListener("smartwear:realtime", listener);
  }, []);
  return <div className="divide-y divide-[var(--color-border)]">{orders.map((order) =>
    <OrderListTile key={order.id} order={order} created={createdId === order.id} />
  )}</div>;
}
