"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type NotificationState = {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  refreshUnreadCount: () => Promise<void>;
  decrementUnread: (amount?: number) => void;
  clearUnread: () => void;
};

const NotificationContext = createContext<NotificationState | null>(null);

export function NotificationProvider({ initialUnreadCount, children }: { initialUnreadCount: number; children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  const refreshUnreadCount = useCallback(async () => {
    const response = await fetch("/api/storefront/notifications/unread-count/", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json() as { count: number };
    setUnreadCount(data.count);
  }, []);

  const value = useMemo<NotificationState>(() => ({
    unreadCount,
    setUnreadCount,
    refreshUnreadCount,
    decrementUnread: (amount = 1) => setUnreadCount((current) => Math.max(0, current - amount)),
    clearUnread: () => setUnreadCount(0),
  }), [refreshUnreadCount, unreadCount]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) {
    return {
      unreadCount: 0,
      setUnreadCount: () => undefined,
      refreshUnreadCount: async () => undefined,
      decrementUnread: () => undefined,
      clearUnread: () => undefined,
    };
  }
  return value;
}
