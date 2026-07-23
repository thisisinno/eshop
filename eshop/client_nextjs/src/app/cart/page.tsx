import { serverGet } from "@/lib/api/django";
import { getCurrentUser } from "@/lib/auth/session";
import type { Cart } from "@/types/storefront";
import Link from "next/link";

export default async function CartPage() {
  const user = await getCurrentUser();
  if (!user) return <section className="rounded-lg bg-white p-6"><h1 className="text-2xl font-black">Cart</h1><p className="mt-2">Sign in to sync your cart.</p><Link className="mt-4 inline-block rounded-lg bg-[#5b2cff] px-5 py-3 font-bold text-white" href="/auth/sign-in">Sign in</Link></section>;
  const cart = await serverGet<Cart>("/storefront/cart/");
  return <section><h1 className="mb-4 text-2xl font-black">Cart</h1><div className="space-y-3">{cart.items.map((item) => <div key={item.id} className="rounded-lg bg-white p-4"><p className="font-bold">{item.product.name}</p><p className="text-sm text-black/60">Qty {item.quantity} · {item.product.currency} {Number(item.line_total).toLocaleString()}</p></div>)}</div><div className="sticky bottom-[84px] mt-4 rounded-lg bg-white p-4 shadow-xl md:bottom-4"><p className="font-black">Subtotal: {Number(cart.subtotal).toLocaleString()}</p><Link href="/checkout" className="mt-3 block rounded-lg bg-[#5b2cff] py-3 text-center font-bold text-white">Checkout</Link></div></section>;
}
