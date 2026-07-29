"use client";
import Link from "next/link";
import { useAdminRealtime } from "@/providers/AdminRealtimeProvider";
export default function ChatsPage() {
  const { chats } = useAdminRealtime();
  return <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark"><div className="border-b p-6 dark:border-dark-3"><h1 className="text-2xl font-bold text-dark dark:text-white">Order chats</h1><p className="mt-1 text-sm text-dark-5">{chats.length} unresolved</p></div><div className="divide-y dark:divide-dark-3">{chats.map((chat) => <Link key={chat.id} href={`/chats/${chat.id}`} className="flex items-center gap-4 p-5 hover:bg-gray-2 dark:hover:bg-dark-2"><div className="min-w-0 flex-1"><h2 className="font-bold text-dark dark:text-white">{chat.order_number} · {chat.customer_name}</h2><p className="truncate text-sm text-dark-5">{chat.latest_message?.body || "Customer requested support"}</p><p className="mt-1 text-xs capitalize text-dark-5">{chat.status} · {chat.assigned_admin_name || "Unassigned"} · {chat.customer_phone}</p></div>{chat.unread_count ? <span className="rounded-full bg-primary px-2 py-1 text-xs text-white">{chat.unread_count}</span> : null}</Link>)}</div>{!chats.length && <p className="p-12 text-center text-dark-5">No unresolved order chats.</p>}</div>;
}
