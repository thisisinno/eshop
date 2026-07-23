import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { serverGet } from "@/lib/api/django";
import { getCurrentUser } from "@/lib/auth/session";
import type { Cart } from "@/types/storefront";

const money = (amount: string, currency = "TZS") => `${currency} ${Number(amount).toLocaleString()}`;

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) return <EmptyState title="Sign in to checkout" action={<ButtonLink href="/auth/sign-in">Sign in</ButtonLink>}>Your cart and order details are private to your account.</EmptyState>;
  const cart = await serverGet<Cart>("/storefront/cart/").catch(() => null);
  if (!cart?.items.length) return <EmptyState title="Your cart is empty" action={<ButtonLink href="/search">Find products</ButtonLink>}>Add products before placing an order.</EmptyState>;
  return (
    <section>
      <div className="border-b border-[var(--color-border)] px-4 py-4">
        <h1 className="text-2xl font-black md:text-3xl">Checkout</h1>
      </div>
      <div className="border-b border-[var(--color-border)] p-4 text-sm">
        <div className="flex justify-between"><span>Items</span><b>{cart.total_quantity}</b></div>
        <div className="mt-2 flex justify-between"><span>Subtotal</span><b>{money(cart.subtotal, cart.items[0]?.product.currency)}</b></div>
        <p className="mt-2 text-[var(--color-text-secondary)]">Prices and stock are verified by the backend when you place the order. Payment status starts unpaid until a real payment integration is connected.</p>
      </div>
      <CheckoutForm user={user} />
    </section>
  );
}
