"use client";

import { useState } from "react";
import { Check, ImagePlus, Package, Rotate3D, Store, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

const steps = [
  { title: "Store & Category", Icon: Store },
  { title: "Product Details", Icon: Package },
  { title: "Gallery", Icon: ImagePlus },
  { title: "360 / 3D", Icon: Rotate3D },
  { title: "Preview & Publish", Icon: Check },
];

export function ProductComposer() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    payload.price = String(payload.price || "0");
    payload.stock_quantity = String(payload.stock_quantity || "0");
    payload.minimum_order_quantity = String(payload.minimum_order_quantity || "1");
    const response = await fetch("/api/storefront/catalog/products/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!response.ok) {
      toast.error("Product could not be saved. Check required catalog fields and permissions.");
      return;
    }
    toast.success("Product draft saved.");
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-black md:text-3xl">Post product</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Create a catalog product using the Django product and media APIs.</p>
      </div>
      <Card className="overflow-x-auto p-2">
        <div className="flex min-w-max gap-2">
          {steps.map(({ title, Icon }, index) => <button type="button" key={title} onClick={() => setStep(index)} className={`inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold transition ${step === index ? "bg-[var(--color-black)] text-white" : "hover:bg-[var(--color-primary-soft)]"}`}><Icon aria-hidden className="h-4 w-4" />{title}</button>)}
        </div>
      </Card>
      <Card className="p-4">
        {step === 0 ? <div className="grid gap-3 sm:grid-cols-2"><L label="Trader/store ID" name="trader" type="number" required /><L label="Category ID" name="category" type="number" required /></div> : null}
        {step === 1 ? <div className="grid gap-3"><L label="Product name" name="name" required /><L label="Short description" name="short_description" required /><textarea name="description" placeholder="Full description" className="min-h-32 rounded-lg border border-[var(--color-border-strong)] p-3 text-sm focus:border-[var(--color-text)] focus:outline-none" /><div className="grid gap-3 sm:grid-cols-3"><L label="Price" name="price" type="number" required /><L label="Compare at price" name="compare_at_price" type="number" /><L label="Stock" name="stock_quantity" type="number" required /></div><L label="Minimum order quantity" name="minimum_order_quantity" type="number" defaultValue={1} /></div> : null}
        {step === 2 ? <UploadPanel title="Gallery media" helper="Upload images or video after saving the product draft." /> : null}
        {step === 3 ? <UploadPanel title="360 frames / GLB" helper="Upload spin frames or a GLB model through the media endpoint after the draft exists." /> : null}
        {step === 4 ? <div className="space-y-3"><p className="text-sm text-[var(--color-text-secondary)]">Preview uses the same storefront card/detail components after the product is saved and media is attached.</p><Button type="submit" loading={loading}>Save draft</Button></div> : null}
      </Card>
      <div className="flex justify-between">
        <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>Back</Button>
        {step < steps.length - 1 ? <Button type="button" onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}>Continue</Button> : null}
      </div>
    </form>
  );
}

function L(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...input } = props;
  return <label className="block"><span className="text-sm font-semibold">{label}</span><Input className="mt-1" {...input} /></label>;
}

function UploadPanel({ title, helper }: { title: string; helper: string }) {
  return <div className="rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-primary-soft)] p-8 text-center"><UploadCloud aria-hidden className="mx-auto h-8 w-8 text-[var(--color-text)]" /><h2 className="mt-3 font-black">{title}</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{helper}</p><input type="file" multiple className="mt-4 block w-full text-sm" /></div>;
}
