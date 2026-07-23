import { serverGet } from "@/lib/api/django";
import { getCurrentUser } from "@/lib/auth/session";
import type { Cart } from "@/types/storefront";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CartClient } from "@/components/cart/CartClient";

export default async function CartPage() {
  const user = await getCurrentUser();
  if (!user) return <EmptyState title="Sign in to sync your cart" action={<ButtonLink href="/auth/sign-in">Sign in</ButtonLink>}>Your cart is stored securely with your account.</EmptyState>;
  const cart = await serverGet<Cart>("/storefront/cart/");
  return <CartClient initialCart={cart} />;
}
