"use client";

import { createContext, useContext, useMemo, useState } from "react";

type MyListState = {
  count: number;
  setCount: (count: number) => void;
  isBookmarked: (productId: number, fallback?: boolean) => boolean;
  setBookmarked: (productId: number, bookmarked: boolean, options?: { created?: boolean; removed?: boolean }) => void;
};

const MyListContext = createContext<MyListState | null>(null);

export function MyListProvider({ initialCount, children }: { initialCount: number; children: React.ReactNode }) {
  const [count, setRawCount] = useState(Math.max(0, initialCount));
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});

  const value = useMemo<MyListState>(() => ({
    count,
    setCount: (nextCount) => setRawCount(Math.max(0, nextCount)),
    isBookmarked: (productId, fallback = false) => overrides[productId] ?? fallback,
    setBookmarked: (productId, bookmarked, options) => {
      setOverrides((current) => ({ ...current, [productId]: bookmarked }));
      setRawCount((current) => {
        if (bookmarked && options?.created) return current + 1;
        if (!bookmarked && options?.removed) return Math.max(0, current - 1);
        return current;
      });
    },
  }), [count, overrides]);

  return <MyListContext.Provider value={value}>{children}</MyListContext.Provider>;
}

export function useMyList() {
  const value = useContext(MyListContext);
  if (!value) {
    return {
      count: 0,
      setCount: () => undefined,
      isBookmarked: (_productId: number, fallback = false) => fallback,
      setBookmarked: () => undefined,
    };
  }
  return value;
}
