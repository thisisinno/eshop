"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCart } from "@/components/cart/CartProvider";
import type { OrderDetail, User } from "@/types/storefront";

type FormState = {
  customer_full_name: string;
  customer_phone: string;
  customer_email: string;
  customer_country: string;
  customer_region: string;
  customer_district: string;
  customer_ward: string;
  customer_street: string;
  customer_address: string;
  delivery_note: string;
};

export function CheckoutForm({ user }: { user: User }) {
  const router = useRouter();
  const { setCount } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({
    customer_full_name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username,
    customer_phone: "",
    customer_email: user.email || "",
    customer_country: "Tanzania",
    customer_region: "",
    customer_district: "",
    customer_ward: "",
    customer_street: "",
    customer_address: "",
    delivery_note: "",
  });
  const set = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const response = await fetch("/api/storefront/orders/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (response.status === 401) {
      toast.error("Sign in to place an order.");
      router.push("/auth/sign-in");
      return;
    }
    if (!response.ok) {
      const data = await response.json().catch(() => null) as { error?: string } | null;
      toast.error(data?.error || "Could not place order.");
      return;
    }
    const order = await response.json() as OrderDetail;
    setCount(0);
    toast.success("Order submitted.");
    router.replace(`/orders?created=${order.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required><Input required value={form.customer_full_name} onChange={(event) => set("customer_full_name", event.target.value)} /></Field>
        <Field label="Phone" required><Input required value={form.customer_phone} onChange={(event) => set("customer_phone", event.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={form.customer_email} onChange={(event) => set("customer_email", event.target.value)} /></Field>
        <Field label="Country"><Input value={form.customer_country} onChange={(event) => set("customer_country", event.target.value)} /></Field>
        <Field label="Region"><Input value={form.customer_region} onChange={(event) => set("customer_region", event.target.value)} /></Field>
        <Field label="District"><Input value={form.customer_district} onChange={(event) => set("customer_district", event.target.value)} /></Field>
        <Field label="Ward"><Input value={form.customer_ward} onChange={(event) => set("customer_ward", event.target.value)} /></Field>
        <Field label="Street"><Input value={form.customer_street} onChange={(event) => set("customer_street", event.target.value)} /></Field>
      </div>
      <Field label="Address"><textarea className="min-h-20 w-full rounded-lg border border-[var(--color-border-strong)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--color-text)]" value={form.customer_address} onChange={(event) => set("customer_address", event.target.value)} /></Field>
      <Field label="Delivery note"><textarea className="min-h-20 w-full rounded-lg border border-[var(--color-border-strong)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--color-text)]" value={form.delivery_note} onChange={(event) => set("delivery_note", event.target.value)} /></Field>
      <div className="border-t border-[var(--color-border)] pt-4">
        <Button loading={submitting} type="submit">Place order</Button>
      </div>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-[var(--color-text)]"><span className="mb-2 block">{label}{required ? " *" : ""}</span>{children}</label>;
}
