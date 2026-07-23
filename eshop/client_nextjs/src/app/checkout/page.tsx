import { ButtonLink } from "@/components/ui/Button";

export default function CheckoutPage() {
  return (
    <section>
      <div className="border-b border-[var(--color-border)] px-4 py-4">
        <h1 className="text-2xl font-black md:text-3xl">Checkout</h1>
      </div>
      <div className="p-5">
        <h2 className="text-lg font-black">Order request</h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Order submission is backed by Django totals and stock validation. Payment integration can attach to this flow without changing cart state.</p>
        <ButtonLink href="/cart" variant="outline" className="mt-5">Review cart</ButtonLink>
      </div>
    </section>
  );
}
