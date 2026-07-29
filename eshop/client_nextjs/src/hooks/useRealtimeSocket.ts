"use client";

import { useEffect, useRef } from "react";

export type RealtimeTicketScope = "customer_realtime" | "order_chat";
export type RealtimeEvent = { type: string; version: number; [key: string]: unknown };

const WS_BASE = (process.env.NEXT_PUBLIC_DJANGO_WS_URL || "").replace(/\/$/, "");

export function useRealtimeSocket({
  scope, chatId, onEvent, onRecovered, enabled = true,
}: {
  scope: RealtimeTicketScope;
  chatId?: number;
  onEvent: (event: RealtimeEvent) => void;
  onRecovered?: () => void | Promise<void>;
  enabled?: boolean;
}) {
  const eventRef = useRef(onEvent);
  const recoveryRef = useRef(onRecovered);
  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const stoppedRef = useRef(false);
  const connectedOnceRef = useRef(false);
  useEffect(() => { eventRef.current = onEvent; }, [onEvent]);
  useEffect(() => { recoveryRef.current = onRecovered; }, [onRecovered]);

  useEffect(() => {
    stoppedRef.current = false;
    async function connect() {
      if (!enabled || stoppedRef.current || !navigator.onLine) return;
      try {
        const response = await fetch("/api/realtime/ticket/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, ...(chatId ? { chat_id: chatId } : {}) }),
        cache: "no-store",
      });
        if (!response.ok || stoppedRef.current) return;
        const ticket = await response.json() as { ticket: string; path: string };
        const base = WS_BASE || `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}`;
        const socket = new WebSocket(`${base}${ticket.path}?ticket=${encodeURIComponent(ticket.ticket)}`);
        socketRef.current = socket;
        socket.onopen = () => {
          attemptRef.current = 0;
          if (connectedOnceRef.current) void recoveryRef.current?.();
          connectedOnceRef.current = true;
        };
        socket.onmessage = (message) => {
          try { eventRef.current(JSON.parse(message.data as string) as RealtimeEvent); } catch { /* ignore malformed events */ }
        };
        socket.onclose = () => {
          if (stoppedRef.current) return;
          const delay = Math.min(30_000, 1_000 * 2 ** attemptRef.current) + Math.random() * 500;
          attemptRef.current += 1;
          retryRef.current = setTimeout(() => void connect(), delay);
        };
      } catch {
        if (!stoppedRef.current) retryRef.current = setTimeout(() => void connect(), 2_000);
      }
    }
    const online = () => void connect();
    window.addEventListener("online", online);
    void connect();
    return () => {
      stoppedRef.current = true;
      window.removeEventListener("online", online);
      if (retryRef.current) clearTimeout(retryRef.current);
      socketRef.current?.close();
    };
  }, [chatId, enabled, scope]);

  return socketRef;
}
