"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [specs, setSpecs] = useState([{ key: "", value: "" }]);
  const [trader, setTrader] = useState<number | null>(null);
  const [category, setCategory] = useState<number | null>(null);
  const [hasSelectable, setHasSelectable] = useState(false);
  const [groups, setGroups] = useState<SelectableGroup[]>([]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(form.entries());
    payload.price = String(payload.price || "0");
    payload.stock_quantity = String(payload.stock_quantity || "0");
    payload.minimum_order_quantity = String(payload.minimum_order_quantity || "1");
    payload.delivery_fee = String(payload.delivery_fee || "0");
    payload.specifications = Object.fromEntries(specs.map((item) => [item.key.trim(), item.value.trim()]).filter(([key, value]) => key && value));
    payload.trader = trader;
    payload.category = category;
    payload.has_selectable_specifications = hasSelectable;
    payload.specification_groups = hasSelectable ? groups.map((group, groupIndex) => ({ ...group, display_order: groupIndex, options: group.options.map((option, optionIndex) => ({ ...option, display_order: optionIndex })) })) : [];
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
        {step === 0 ? <CatalogPickers trader={trader} category={category} onTrader={setTrader} onCategory={setCategory} /> : null}
        {step === 1 ? <div className="grid gap-3"><L label="Product name" name="name" required /><div className="grid gap-3 sm:grid-cols-3"><L label="SKU" name="sku" /><L label="Currency" name="currency" defaultValue="TZS" /><L label="Unit" name="unit" placeholder="piece, box, kg" /></div><L label="Short description" name="short_description" required /><textarea name="description" placeholder="Full description" className="min-h-32 rounded-lg border border-[var(--color-border-strong)] p-3 text-sm focus:border-[var(--color-text)] focus:outline-none" /><div className="grid gap-3 sm:grid-cols-3"><L label="Price" name="price" type="number" step="0.01" required /><L label="Compare at price" name="compare_at_price" type="number" step="0.01" /><L label="Delivery cost" name="delivery_fee" type="number" step="0.01" defaultValue={0} /></div><div className="grid gap-3 sm:grid-cols-2"><L label="Stock" name="stock_quantity" type="number" required /><L label="Minimum order quantity" name="minimum_order_quantity" type="number" defaultValue={1} /></div><SpecificationEditor specs={specs} setSpecs={setSpecs} /><SelectableSpecificationEditor enabled={hasSelectable} setEnabled={setHasSelectable} groups={groups} setGroups={setGroups} /></div> : null}
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

type TraderOption = { id: number; business_name: string; trader_code: string; region: string; district: string };
type CategoryOption = { id: number; name: string; slug: string; parent_id: number | null };
type FormOptions = { traders: TraderOption[]; categories: CategoryOption[] };
type SelectableGroup = { name: string; selection_mode: "single" | "multiple"; is_required: boolean; is_active: boolean; display_order: number; options: { value: string; price_adjustment: string; is_active: boolean; display_order: number }[] };

function CatalogPickers({ trader, category, onTrader, onCategory }: { trader: number | null; category: number | null; onTrader: (id: number) => void; onCategory: (id: number) => void }) {
  const [search, setSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [options, setOptions] = useState<FormOptions>({ traders: [], categories: [] });
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const response = await fetch(`/api/storefront/catalog/product-form-options/?search=${encodeURIComponent(search)}`, { signal: controller.signal });
      if (response.ok) setOptions(await response.json() as FormOptions);
      setLoading(false);
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [search]);
  const paths = useMemo(() => {
    const byId = new Map(options.categories.map((item) => [item.id, item]));
    return new Map(options.categories.map((item) => {
      const names = [item.name]; let parent = byId.get(item.parent_id ?? -1); const seen = new Set<number>();
      while (parent && !seen.has(parent.id)) { seen.add(parent.id); names.unshift(parent.name); parent = byId.get(parent.parent_id ?? -1); }
      return [item.id, names.join(" › ")];
    }));
  }, [options.categories]);
  return <div className="grid gap-4 sm:grid-cols-2">
    <label><span className="text-sm font-semibold">Trader / store</span><Input className="mt-1" role="combobox" aria-expanded={Boolean(search)} placeholder="Search registered business..." value={search} onChange={(event) => setSearch(event.target.value)} /><div role="listbox" className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-[var(--color-border)]">{loading ? <p className="p-3 text-sm">Searching...</p> : options.traders.map((item) => <button type="button" role="option" aria-selected={trader === item.id} key={item.id} onClick={() => { onTrader(item.id); setSearch(item.business_name); }} className={`block min-h-12 w-full px-3 py-2 text-left hover:bg-[var(--color-primary-soft)] ${trader === item.id ? "bg-[var(--color-primary-soft)]" : ""}`}><b className="block">{item.business_name}</b><span className="text-xs text-[var(--color-text-secondary)]">{item.trader_code} · {[item.region, item.district].filter(Boolean).join(", ")}</span></button>)}</div></label>
    <label><span className="text-sm font-semibold">Category</span><Input className="mt-1" role="combobox" aria-expanded={Boolean(categorySearch)} placeholder="Search category..." value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} /><div role="listbox" className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-[var(--color-border)]">{options.categories.filter((item) => (paths.get(item.id) ?? "").toLowerCase().includes(categorySearch.toLowerCase())).map((item) => <button type="button" role="option" aria-selected={category === item.id} key={item.id} onClick={() => { onCategory(item.id); setCategorySearch(paths.get(item.id) ?? item.name); }} className={`block min-h-11 w-full px-3 py-2 text-left hover:bg-[var(--color-primary-soft)] ${category === item.id ? "bg-[var(--color-primary-soft)] font-bold" : ""}`}>{paths.get(item.id)}</button>)}</div></label>
  </div>;
}

function SelectableSpecificationEditor({ enabled, setEnabled, groups, setGroups }: { enabled: boolean; setEnabled: (value: boolean) => void; groups: SelectableGroup[]; setGroups: React.Dispatch<React.SetStateAction<SelectableGroup[]>> }) {
  const addGroup = () => setGroups((current) => [...current, { name: "", selection_mode: "single", is_required: true, is_active: true, display_order: current.length, options: [{ value: "", price_adjustment: "0", is_active: true, display_order: 0 }] }]);
  return <section className="border-t border-[var(--color-border)] pt-4"><label className="flex items-center gap-3 font-black"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="h-5 w-5 accent-black" />This product has selectable specifications</label>{enabled ? <div className="mt-3 space-y-4">{groups.map((group, groupIndex) => <div key={groupIndex} className="rounded-xl border border-[var(--color-border)] p-3"><div className="grid gap-2 sm:grid-cols-3"><Input aria-label="Group name" placeholder="Size, Color, Material" value={group.name} onChange={(event) => setGroups((current) => current.map((item, index) => index === groupIndex ? { ...item, name: event.target.value } : item))} /><select aria-label="Selection mode" value={group.selection_mode} onChange={(event) => setGroups((current) => current.map((item, index) => index === groupIndex ? { ...item, selection_mode: event.target.value as "single" | "multiple" } : item))} className="h-11 rounded-lg border px-3"><option value="single">Single selection</option><option value="multiple">Multiple selection</option></select><label className="flex items-center gap-2"><input type="checkbox" checked={group.is_required} onChange={(event) => setGroups((current) => current.map((item, index) => index === groupIndex ? { ...item, is_required: event.target.checked } : item))} />Required</label></div>{group.options.map((option, optionIndex) => <div key={optionIndex} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><Input aria-label="Option value" placeholder="XL" value={option.value} onChange={(event) => setGroups((current) => current.map((item, index) => index === groupIndex ? { ...item, options: item.options.map((row, rowIndex) => rowIndex === optionIndex ? { ...row, value: event.target.value } : row) } : item))} /><Input aria-label="Price adjustment" type="number" step="0.01" value={option.price_adjustment} onChange={(event) => setGroups((current) => current.map((item, index) => index === groupIndex ? { ...item, options: item.options.map((row, rowIndex) => rowIndex === optionIndex ? { ...row, price_adjustment: event.target.value } : row) } : item))} /><button type="button" onClick={() => setGroups((current) => current.map((item, index) => index === groupIndex ? { ...item, options: item.options.filter((_, rowIndex) => rowIndex !== optionIndex) } : item))}>Remove</button></div>)}<p className="mt-2 text-xs text-[var(--color-text-secondary)]">Positive increases base price; negative decreases it; zero is included.</p><button type="button" className="mt-2 text-sm font-bold" onClick={() => setGroups((current) => current.map((item, index) => index === groupIndex ? { ...item, options: [...item.options, { value: "", price_adjustment: "0", is_active: true, display_order: item.options.length }] } : item))}>+ Add option</button></div>)}<button type="button" className="font-bold" onClick={addGroup}>+ Add specification group</button></div> : null}</section>;
}

function SpecificationEditor({ specs, setSpecs }: { specs: { key: string; value: string }[]; setSpecs: React.Dispatch<React.SetStateAction<{ key: string; value: string }[]>> }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-black">Specifications</h2>
        <button type="button" className="text-sm font-bold hover:underline" onClick={() => setSpecs((current) => [...current, { key: "", value: "" }])}>+ Add specification</button>
      </div>
      <div className="space-y-2">
        {specs.map((item, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Input aria-label="Specification name" placeholder="Brand" value={item.key} onChange={(event) => setSpecs((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, key: event.target.value } : row))} />
            <Input aria-label="Specification value" placeholder="Apple" value={item.value} onChange={(event) => setSpecs((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, value: event.target.value } : row))} />
            <button type="button" className="rounded-full border border-[var(--color-border-strong)] px-4 text-sm font-bold disabled:opacity-40" disabled={specs.length === 1} onClick={() => setSpecs((current) => current.filter((_, rowIndex) => rowIndex !== index))}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function L(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...input } = props;
  return <label className="block"><span className="text-sm font-semibold">{label}</span><Input className="mt-1" {...input} /></label>;
}

function UploadPanel({ title, helper }: { title: string; helper: string }) {
  return <div className="rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-primary-soft)] p-8 text-center"><UploadCloud aria-hidden className="mx-auto h-8 w-8 text-[var(--color-text)]" /><h2 className="mt-3 font-black">{title}</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{helper}</p><input type="file" multiple className="mt-4 block w-full text-sm" /></div>;
}
