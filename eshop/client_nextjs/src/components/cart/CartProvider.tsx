"use client";

import { createContext, useContext, useMemo, useState } from "react";

type CartState = {
  count: number;
  setCount: (count: number) => void;
  increment: (amount?: number) => void;
};

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ initialCount, children }: { initialCount: number; children: React.ReactNode }) {
  const [count, setCount] = useState(initialCount);
  const value = useMemo(() => ({ count, setCount, increment: (amount = 1) => setCount((current) => current + amount) }), [count]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) return { count: 0, setCount: () => undefined, increment: () => undefined };
  return value;
}
