"use client";
import Link from "next/link";
import { useAdminRealtime } from "@/providers/AdminRealtimeProvider";

export function ChatsCard() {
  const { chats } = useAdminRealtime();
  return <div className="col-span-12 rounded-[10px] bg-white py-6 shadow-1 dark:bg-gray-dark xl:col-span-4">
    <div className="mb-5.5 flex items-center justify-between px-7.5"><h2 className="text-body-2xlg font-bold text-dark dark:text-white">Order chats</h2><Link href="/chats" className="text-sm font-medium text-primary">View all</Link></div>
    <ul>{chats.slice(0, 5).map((chat) => <li key={chat.id}><Link href={`/chats/${chat.id}`} className="flex items-center gap-3 px-7.5 py-3 hover:bg-gray-2 dark:hover:bg-dark-2"><span className="grid size-12 shrink-0 place-items-center rounded-full bg-gray-2 font-bold text-dark dark:bg-dark-2 dark:text-white">{chat.customer_name.charAt(0).toUpperCase()}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-dark dark:text-white">{chat.order_number} · {chat.customer_name}</strong><span className="block truncate text-sm text-dark-5">{chat.latest_message?.body || "Customer requested support"}</span></span>{chat.unread_count ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">{chat.unread_count > 9 ? "9+" : chat.unread_count}</span> : null}</Link></li>)}</ul>
    {!chats.length && <p className="px-7.5 py-8 text-center text-sm text-dark-5">No unresolved order chats.</p>}
  </div>;
}
