"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { Cart } from "@/types/storefront";

type CartState = {
  cart: Cart | null;
  count: number;
  productQuantities: Record<number, number>;
  setCartState: (cart: Cart | null) => void;
  setCount: (count: number) => void;
  hasProduct: (productId: number) => boolean;
  quantityFor: (productId: number) => number;
};

const CartContext = createContext<CartState | null>(null);

function deriveProductQuantities(cart: Cart | null) {
  if (!cart) return {};
  return Object.fromEntries(cart.items.map((item) => [item.product.id, item.quantity]));
}

export function CartProvider({ initialCart, children }: { initialCart: Cart | null; children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(initialCart);
  const productQuantities = useMemo(() => deriveProductQuantities(cart), [cart]);
  const count = cart?.total_quantity ?? 0;
  const value = useMemo<CartState>(() => ({
    cart,
    count,
    productQuantities,
    setCartState: setCart,
    setCount: (nextCount) => setCart((current) => current ? { ...current, total_quantity: nextCount } : current),
    hasProduct: (productId) => (productQuantities[productId] ?? 0) > 0,
    quantityFor: (productId) => productQuantities[productId] ?? 0,
  }), [cart, count, productQuantities]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) {
    return {
      cart: null,
      count: 0,
      productQuantities: {},
      setCartState: () => undefined,
      setCount: () => undefined,
      hasProduct: () => false,
      quantityFor: () => 0,
    };
  }
  return value;
}
