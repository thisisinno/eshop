"use client";

import Link from "next/link";
import { Loader2, MessageCircle, RefreshCw, Send } from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRealtimeSocket, type RealtimeEvent } from "@/hooks/useRealtimeSocket";
import type { ChatMessage, OrderChat, Paginated } from "@/types/storefront";

export function OrderChatClient({ orderId, initialChat, initialMessages }: { orderId: number; initialChat: OrderChat | null; initialMessages: ChatMessage[] }) {
  const [chat, setChat] = useState(initialChat);
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seen = useRef(new Set(initialMessages.map((message) => message.client_message_id)));

  const recover = useCallback(async () => {
    if (!chat) return;
    const response = await fetch(`/api/storefront/orders/${orderId}/chat/messages/`, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json() as Paginated<ChatMessage>;
    setMessages((current) => {
      const merged = [...current];
      for (const message of data.results) if (!seen.current.has(message.client_message_id)) {
        seen.current.add(message.client_message_id); merged.push(message);
      }
      return merged.sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
  }, [chat, orderId]);
  const onEvent = useCallback((event: RealtimeEvent) => {
    if (event.type === "chat.message.created") {
      const message = event.message as ChatMessage;
      if (seen.current.has(message.client_message_id)) return;
      seen.current.add(message.client_message_id);
      setMessages((current) => [...current, message]);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
    if (event.type === "chat.status.changed" || event.type === "chat.assignment.changed") {
      setChat((current) => current ? { ...current,
        status: event.status as OrderChat["status"],
        close_reason: typeof event.close_reason === "string" ? event.close_reason : current.close_reason,
        assigned_admin_name: typeof event.assigned_admin_name === "string" ? event.assigned_admin_name : current.assigned_admin_name,
      } : current);
    }
  }, []);
  useRealtimeSocket({ scope: "order_chat", chatId: chat?.id, onEvent, onRecovered: recover, enabled: Boolean(chat) });

  useEffect(() => {
    const last = messages.at(-1);
    if (!last || last.sender_role !== "admin") return;
    void fetch(`/api/storefront/orders/${orderId}/chat/read/`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: last.id }),
    });
  }, [messages, orderId]);

  async function stateAction(action: "request" | "reopen") {
    setBusy(true);
    const response = await fetch(`/api/storefront/orders/${orderId}/chat/${action}/`, { method: "POST" });
    setBusy(false);
    if (!response.ok) { toast.error("Could not update chat."); return; }
    setChat(await response.json() as OrderChat);
    toast.success(action === "request" ? "Chat request sent." : "Chat reopen request sent.");
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    const text = body.trim(); if (!text || !chat) return;
    const client_message_id = crypto.randomUUID();
    const optimistic: ChatMessage = { id: -Date.now(), chat: chat.id, sender: -1, sender_name: "You", sender_role: "customer", body: text, client_message_id, created_at: new Date().toISOString() };
    seen.current.add(client_message_id); setMessages((current) => [...current, optimistic]); setBody(""); setBusy(true);
    const response = await fetch(`/api/storefront/orders/${orderId}/chat/messages/`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text, client_message_id }),
    });
    setBusy(false);
    if (!response.ok) {
      seen.current.delete(client_message_id); setMessages((current) => current.filter((item) => item.client_message_id !== client_message_id));
      setBody(text); toast.error("Message was not sent."); return;
    }
    const saved = await response.json() as ChatMessage;
    setMessages((current) => current.map((item) => item.client_message_id === client_message_id ? saved : item));
  }

  if (!chat) return <section className="grid min-h-[60vh] place-items-center p-6 text-center"><div><MessageCircle className="mx-auto h-9 w-9" /><h1 className="mt-4 text-xl font-black">Need help with this order?</h1><p className="mt-2 text-sm text-[var(--color-text-secondary)]">Request a chat with SmartWear support.</p><button disabled={busy} onClick={() => stateAction("request")} className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 font-bold text-white">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}Request chat</button></div></section>;
  return <section className="flex min-h-[calc(100dvh-76px)] flex-col">
    <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-white/95 p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3"><div><h1 className="font-black">{chat.order_number}</h1><p className="text-xs capitalize text-[var(--color-text-secondary)]">{chat.status} · {chat.assigned_admin_name || "SmartWear support"}</p></div><Link href={`/orders/${orderId}`} className="text-sm font-bold underline">Details</Link></div>
    </header>
    <div className="flex-1 space-y-3 overflow-y-auto p-4 pb-36">
      {chat.status === "requested" ? <p className="text-center text-xs font-bold text-[var(--color-text-secondary)]">Waiting for SmartWear support</p> : null}
      {messages.map((message) => <div key={message.client_message_id} className={`flex ${message.sender_role === "customer" ? "justify-end" : message.sender_role === "system" ? "justify-center" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl px-4 py-2 ${message.sender_role === "customer" ? "bg-black text-white" : message.sender_role === "system" ? "bg-transparent text-xs text-[var(--color-text-secondary)]" : "bg-[var(--color-primary-soft)] text-black"}`}><p className="whitespace-pre-wrap break-words text-sm">{message.body}</p><time className="mt-1 block text-[10px] opacity-65">{new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></div></div>)}
      <div ref={bottomRef} />
    </div>
    {chat.status === "closed" ? <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] border-t bg-white p-4 text-center"><p className="text-sm">{chat.close_reason || "This chat was closed."}</p><button disabled={busy} onClick={() => stateAction("reopen")} className="mt-2 inline-flex items-center gap-2 rounded-full border px-4 py-2 font-bold">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Request to reopen</button></div> :
    <form onSubmit={send} className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] flex gap-2 border-t bg-white p-3"><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} rows={1} aria-label="Message" className="min-h-11 flex-1 resize-none rounded-2xl border px-4 py-3" placeholder="Message SmartWear support" /><button disabled={busy || !body.trim()} aria-label="Send message" className="grid h-11 w-11 place-items-center rounded-full bg-black text-white">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}</button></form>}
  </section>;
}
