"use client";

import { apiGet, apiPost } from "@/lib/api/client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type AdminChatSummary = {
  id: number; order: number; order_number: string; customer_name: string; customer_phone: string;
  status: "requested" | "open" | "closed"; assigned_admin_name: string | null;
  last_message_at: string | null; latest_message: { body: string; created_at: string } | null; unread_count: number;
};
export type AdminRealtimeEvent = { type: string; version: number; chat_id?: number; order_id?: number; [key: string]: unknown };
type ContextValue = { chats: AdminChatSummary[]; unresolvedCount: number; refreshChats: () => Promise<void>; subscribe: (listener: (event: AdminRealtimeEvent) => void) => () => void };
const Context = createContext<ContextValue | null>(null);
const WS_BASE = (process.env.NEXT_PUBLIC_WS_BASE_URL || process.env.NEXT_PUBLIC_DJANGO_WS_URL || "").replace(/\/$/, "");

export function AdminRealtimeProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<AdminChatSummary[]>([]);
  const listeners = useRef(new Set<(event: AdminRealtimeEvent) => void>());
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopped = useRef(false);
  const attempt = useRef(0);
  const refreshChats = useCallback(async () => {
    try { setChats(await apiGet<AdminChatSummary[]>("/order-chats/?state=unresolved")); } catch { setChats([]); }
  }, []);
  const connect = useCallback(async () => {
    if (stopped.current || !navigator.onLine) return;
    try {
      const ticket = await apiPost<{ ticket: string; path: string }>("/realtime/tickets/", { scope: "admin_realtime" });
      const origin = `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}`;
      const base = WS_BASE.startsWith("/") ? `${origin}${WS_BASE.replace(/\/ws\/?$/, "")}` : (WS_BASE || origin);
      const socket = new WebSocket(`${base}${ticket.path}?ticket=${encodeURIComponent(ticket.ticket)}`);
      socket.onopen = () => { attempt.current = 0; void refreshChats(); };
      socket.onmessage = (raw) => {
        const event = JSON.parse(raw.data as string) as AdminRealtimeEvent;
        listeners.current.forEach((listener) => listener(event));
        if (event.type.startsWith("chat.")) void refreshChats();
      };
      socket.onclose = () => {
        if (stopped.current) return;
        const delay = Math.min(30_000, 1_000 * 2 ** attempt.current++);
        retry.current = setTimeout(() => void connect(), delay);
      };
    } catch { if (!stopped.current) retry.current = setTimeout(() => void connect(), 2_000); }
  }, [refreshChats]);
  useEffect(() => {
    stopped.current = false; const online = () => void connect(); window.addEventListener("online", online);
    void refreshChats(); void connect();
    return () => { stopped.current = true; window.removeEventListener("online", online); if (retry.current) clearTimeout(retry.current); };
  }, [connect, refreshChats]);
  const subscribe = useCallback((listener: (event: AdminRealtimeEvent) => void) => { listeners.current.add(listener); return () => { listeners.current.delete(listener); }; }, []);
  const value = useMemo(() => ({ chats, unresolvedCount: chats.length, refreshChats, subscribe }), [chats, refreshChats, subscribe]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAdminRealtime() { const value = useContext(Context); if (!value) throw new Error("useAdminRealtime requires AdminRealtimeProvider"); return value; }
