"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ImagePlus, Package, Rotate3D, Store, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { ProductMedia } from "@/types/storefront";

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
  const [draftProductId, setDraftProductId] = useState<number | null>(null);
  const [media, setMedia] = useState<ProductMedia[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [publishError, setPublishError] = useState("");
  const [draft, setDraft] = useState({
    name: "", sku: "", currency: "TZS", unit: "", short_description: "", description: "",
    price: "", compare_at_price: "", delivery_fee: "0", stock_quantity: "0", minimum_order_quantity: "1",
    view_360_enabled: false, view_360_mode: "spin" as "spin" | "model",
  });
  const updateDraft = (key: keyof typeof draft, value: string | boolean) => setDraft((current) => ({ ...current, [key]: value }));
  const spinFrameCount = new Set(media.filter((item) => item.media_type === "spin_frame" && item.frame_index !== null).map((item) => item.frame_index)).size;
  const hasModel = media.some((item) => item.media_type === "model_3d");
  const interactiveReady = !draft.view_360_enabled || (draft.view_360_mode === "spin" ? spinFrameCount >= 12 : hasModel);
  const interactiveGuidance = draft.view_360_mode === "spin"
    ? `Upload ${Math.max(0, 12 - spinFrameCount)} more frame${12 - spinFrameCount === 1 ? "" : "s"}, or continue without 360.`
    : "Upload a GLB model, or continue without 360.";
  async function saveDraft(status = "draft", overrides: Partial<typeof draft> = {}) {
    const nextErrors: Record<string, string> = {};
    if (!trader) nextErrors.trader = "Select a store.";
    if (!category) nextErrors.category = "Select a category.";
    if (!draft.name.trim()) nextErrors.name = "Enter a product name.";
    if (!draft.price || Number(draft.price) < 0) nextErrors.price = "Enter a valid price.";
    if (Number(draft.stock_quantity) < 0) nextErrors.stock_quantity = "Stock cannot be negative.";
    if (Number(draft.minimum_order_quantity) < 1) nextErrors.minimum_order_quantity = "Minimum quantity must be at least 1.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) throw new Error("Complete the required product details.");
    setLoading(true);
    const payload: Record<string, unknown> = { ...draft, ...overrides, status };
    payload.specifications = Object.fromEntries(specs.map((item) => [item.key.trim(), item.value.trim()]).filter(([key, value]) => key && value));
    payload.trader = trader;
    payload.category = category;
    payload.has_selectable_specifications = hasSelectable;
    payload.specification_groups = hasSelectable ? groups.map((group, groupIndex) => ({ ...group, display_order: groupIndex, options: group.options.map((option, optionIndex) => ({ ...option, display_order: optionIndex })) })) : [];
    const response = await fetch(draftProductId ? `/api/storefront/catalog/products/${draftProductId}/` : "/api/storefront/catalog/products/", {
      method: draftProductId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      setLoading(false);
      throw new Error("Product could not be saved. Check catalog fields and permissions.");
    }
    const product = await response.json() as { id: number; media?: ProductMedia[] };
    setDraftProductId(product.id);
    if (product.media) setMedia(product.media);
    setLoading(false);
    return product;
  }
  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!interactiveReady) {
      setPublishError(`Interactive view isn't ready yet. ${interactiveGuidance}`);
      return;
    }
    setPublishError("");
    try { await saveDraft("pending_review"); toast.success("Product submitted for review."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Product could not be saved."); }
  }
  async function continueWithout360() {
    setPublishError("");
    setDraft((current) => ({ ...current, view_360_enabled: false }));
    try {
      await saveDraft("pending_review", { view_360_enabled: false });
      toast.success("360 / 3D disabled. Product submitted for review.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Product could not be saved.");
    }
  }
  async function continueStep() {
    try {
      if (step === 0 && (!trader || !category)) {
        setErrors({ trader: !trader ? "Select a store." : "", category: !category ? "Select a category." : "" });
        return;
      }
      if (step === 1) await saveDraft();
      setStep((value) => Math.min(steps.length - 1, value + 1));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save draft."); }
  }
  return (
    <form onSubmit={publish} className="space-y-4">
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
        {step === 0 ? <><CatalogPickers trader={trader} category={category} onTrader={setTrader} onCategory={setCategory} />{errors.trader || errors.category ? <p className="mt-3 text-sm font-semibold">{errors.trader || errors.category}</p> : null}</> : null}
        {step === 1 ? <div className="grid gap-3"><Controlled label="Product name" value={draft.name} onChange={(v) => updateDraft("name", v)} error={errors.name} required /><div className="grid gap-3 sm:grid-cols-3"><Controlled label="SKU" value={draft.sku} onChange={(v) => updateDraft("sku", v)} /><Controlled label="Currency" value={draft.currency} onChange={(v) => updateDraft("currency", v)} /><Controlled label="Unit" value={draft.unit} onChange={(v) => updateDraft("unit", v)} placeholder="piece, box, kg" /></div><Controlled label="Short description" value={draft.short_description} onChange={(v) => updateDraft("short_description", v)} /><textarea value={draft.description} onChange={(e) => updateDraft("description", e.target.value)} placeholder="Full description" className="min-h-32 rounded-lg border border-[var(--color-border-strong)] p-3 text-sm focus:border-[var(--color-text)] focus:outline-none" /><div className="grid gap-3 sm:grid-cols-3"><Controlled label="Price" value={draft.price} onChange={(v) => updateDraft("price", v)} error={errors.price} type="number" step="0.01" required /><Controlled label="Compare at price" value={draft.compare_at_price} onChange={(v) => updateDraft("compare_at_price", v)} type="number" step="0.01" /><Controlled label="Delivery cost" value={draft.delivery_fee} onChange={(v) => updateDraft("delivery_fee", v)} type="number" step="0.01" /></div><div className="grid gap-3 sm:grid-cols-2"><Controlled label="Stock" value={draft.stock_quantity} onChange={(v) => updateDraft("stock_quantity", v)} error={errors.stock_quantity} type="number" required /><Controlled label="Minimum order quantity" value={draft.minimum_order_quantity} onChange={(v) => updateDraft("minimum_order_quantity", v)} error={errors.minimum_order_quantity} type="number" /></div><SpecificationEditor specs={specs} setSpecs={setSpecs} /><SelectableSpecificationEditor enabled={hasSelectable} setEnabled={setHasSelectable} groups={groups} setGroups={setGroups} /></div> : null}
        {step === 2 ? <MediaUploader productId={draftProductId} media={media} setMedia={setMedia} mediaType="gallery" /> : null}
        {step === 3 ? <InteractiveMediaStep productId={draftProductId} draft={draft} updateDraft={updateDraft} media={media} setMedia={setMedia} /> : null}
        {step === 4 ? <><Preview productId={draftProductId} draft={draft} trader={trader} category={category} media={media} />{publishError ? <div role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm"><p className="font-black">Complete 360 media or continue without 360.</p><p className="mt-1">{publishError}</p><div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => setStep(3)}>Go to 360 / 3D</Button><Button type="button" variant="outline" loading={loading} onClick={() => void continueWithout360()}>Continue without 360</Button></div></div> : null}<div className="mt-4 flex gap-2"><Button type="button" variant="outline" loading={loading} onClick={() => void saveDraft().then(() => toast.success("Draft saved.")).catch((e) => toast.error(e.message))}>Save draft</Button><Button type="submit" loading={loading}>Submit for review</Button></div></> : null}
      </Card>
      <div className="flex justify-between">
        <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>Back</Button>
        {step < steps.length - 1 ? <Button type="button" loading={loading} onClick={() => void continueStep()}>Continue</Button> : null}
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

function Controlled({ label, value, onChange, error, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & { label: string; value: string; onChange: (value: string) => void; error?: string }) {
  return <label className="block"><span className="text-sm font-semibold">{label}</span><Input className="mt-1" value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} {...props} />{error ? <span className="mt-1 block text-xs font-semibold">{error}</span> : null}</label>;
}

type ComposerMedia = ProductMedia & { file_url?: string };
const mediaUrl = (item: ComposerMedia) => item.url || item.file_url || null;

function MediaUploader({ productId, media, setMedia, mediaType }: { productId: number | null; media: ProductMedia[]; setMedia: React.Dispatch<React.SetStateAction<ProductMedia[]>>; mediaType: "gallery" | "spin" | "model" | "poster" }) {
  const [uploading, setUploading] = useState(false);
  const accepted = mediaType === "model" ? ".glb" : mediaType === "gallery" ? "image/jpeg,image/png,image/webp,video/mp4,video/webm" : "image/jpeg,image/png,image/webp";
  const visible = media.filter((item) => mediaType === "gallery" ? ["image", "clip"].includes(item.media_type) : item.media_type === ({ spin: "spin_frame", model: "model_3d", poster: "poster" } as const)[mediaType]);
  async function upload(files: FileList | null) {
    if (!productId || !files?.length) return;
    setUploading(true);
    for (const [offset, file] of Array.from(files).entries()) {
      const type = mediaType === "gallery" ? (file.type.startsWith("video/") ? "clip" : "image") : ({ spin: "spin_frame", model: "model_3d", poster: "poster" } as const)[mediaType];
      const body = new FormData();
      body.set("file", file); body.set("media_type", type); body.set("sort_order", String(visible.length + offset));
      if (type === "spin_frame") {
        const existingIndices = visible
          .map((item) => item.frame_index)
          .filter((value): value is number => value !== null);
        const nextIndex = existingIndices.length ? Math.max(...existingIndices) + 1 : 0;
        body.set("frame_index", String(nextIndex + offset));
      }
      const response = await fetch(`/api/storefront/catalog/products/${productId}/media/`, { method: "POST", body });
      if (response.ok) {
        const uploaded = await response.json() as ComposerMedia;
        setMedia((current) => [...current, { ...uploaded, url: uploaded.file_url || uploaded.url }]);
      } else toast.error(`${file.name} could not be uploaded.`);
    }
    setUploading(false);
  }
  async function remove(item: ProductMedia) {
    if (!productId) return;
    const response = await fetch(`/api/storefront/catalog/products/${productId}/media/${item.id}/`, { method: "DELETE" });
    if (response.ok) setMedia((current) => current.filter((row) => row.id !== item.id));
  }
  return <section>
    <div className="rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-primary-soft)] p-6 text-center"><UploadCloud aria-hidden className="mx-auto h-8 w-8" /><p className="mt-2 text-sm font-bold">{uploading ? "Uploading…" : "Choose media to upload"}</p><input disabled={!productId || uploading} type="file" multiple={mediaType === "gallery" || mediaType === "spin"} accept={accepted} className="mt-4 block w-full text-sm" onChange={(event) => void upload(event.target.files)} /></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">{visible.map((item, index) => <div key={item.id} className="rounded-lg border p-3"><p className="text-sm font-bold">{mediaType === "spin" ? `Frame ${index + 1}` : `Slide ${index + 1}`}{item.is_primary ? " · Cover" : ""}</p><p className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">{item.title || mediaUrl(item as ComposerMedia) || item.media_type}</p><button type="button" onClick={() => void remove(item)} className="mt-2 text-xs font-bold underline">Remove</button></div>)}</div>
  </section>;
}

function InteractiveMediaStep({ productId, draft, updateDraft, media, setMedia }: { productId: number | null; draft: { view_360_enabled: boolean; view_360_mode: "spin" | "model" }; updateDraft: (key: "view_360_enabled" | "view_360_mode", value: boolean | string) => void; media: ProductMedia[]; setMedia: React.Dispatch<React.SetStateAction<ProductMedia[]>> }) {
  const frames = new Set(media.filter((item) => item.media_type === "spin_frame" && item.frame_index !== null).map((item) => item.frame_index)).size;
  return <div className="space-y-4"><h2 className="text-lg font-black">Does this product have an interactive 360 / 3D view?</h2><div className="flex gap-2"><Button type="button" variant={!draft.view_360_enabled ? "primary" : "outline"} onClick={() => updateDraft("view_360_enabled", false)}>No</Button><Button type="button" variant={draft.view_360_enabled ? "primary" : "outline"} onClick={() => updateDraft("view_360_enabled", true)}>Yes</Button></div>{draft.view_360_enabled ? <><div className="flex gap-4"><label><input type="radio" checked={draft.view_360_mode === "spin"} onChange={() => updateDraft("view_360_mode", "spin")} /> 360 image spin</label><label><input type="radio" checked={draft.view_360_mode === "model"} onChange={() => updateDraft("view_360_mode", "model")} /> 3D GLB model</label></div>{draft.view_360_mode === "spin" ? <><Card className="p-4 text-sm"><h3 className="font-black">How to create a good 360 product view</h3><ol className="mt-2 list-decimal space-y-1 pl-5"><li>Place the product in one fixed position.</li><li>Keep camera height and distance unchanged.</li><li>Keep lighting and background unchanged.</li><li>Rotate the product equally between images.</li><li>Upload images in rotation order.</li><li>Minimum 12; 24–36 is smoother.</li></ol><p className="mt-3 font-bold">{frames} / 12 frames · {frames >= 12 ? "✓ Ready for 360" : `Need ${12 - frames} more`}</p></Card><MediaUploader productId={productId} media={media} setMedia={setMedia} mediaType="spin" /></> : <><Card className="p-4 text-sm"><h3 className="font-black">Upload one .GLB model of the product</h3><p className="mt-1">Accepted format: GLB. Maximum size: 120MB. Customers can drag to rotate and zoom.</p></Card><MediaUploader productId={productId} media={media} setMedia={setMedia} mediaType="model" /><p className="text-sm font-bold">Optional poster image</p><MediaUploader productId={productId} media={media} setMedia={setMedia} mediaType="poster" /></>}</> : <p className="text-sm text-[var(--color-text-secondary)]">Continue without 360. Ordinary products do not require it.</p>}</div>;
}

function Preview({ productId, draft, trader, category, media }: { productId: number | null; draft: { name: string; price: string; currency: string; short_description: string; stock_quantity: string; delivery_fee: string; view_360_enabled: boolean; view_360_mode: "spin" | "model" }; trader: number | null; category: number | null; media: ProductMedia[] }) {
  const gallery = media.filter((item) => ["image", "clip"].includes(item.media_type));
  const validFrames = new Set(media.filter((item) => item.media_type === "spin_frame" && item.frame_index !== null).map((item) => item.frame_index)).size;
  const ready360 = !draft.view_360_enabled || (draft.view_360_mode === "spin" ? validFrames >= 12 : media.some((item) => item.media_type === "model_3d"));
  return <div className="grid gap-5 md:grid-cols-2"><div className="aspect-[4/5] rounded-xl bg-[var(--color-primary-soft)] p-6"><p className="text-sm font-bold">{gallery.length ? `${gallery.length} gallery slide${gallery.length === 1 ? "" : "s"}` : "No cover image yet"}</p></div><div><p className="text-xs font-bold text-[var(--color-text-secondary)]">DRAFT PREVIEW · #{productId}</p><h2 className="mt-2 text-2xl font-black">{draft.name || "Untitled product"}</h2><p className="mt-3 text-xl font-black">{draft.currency} {Number(draft.price || 0).toLocaleString()}</p><p className="mt-3 text-sm">{draft.short_description}</p><ul className="mt-5 space-y-2 text-sm"><li>{trader ? "✓" : "○"} Store selected</li><li>{category ? "✓" : "○"} Category selected</li><li>{draft.name && draft.price ? "✓" : "○"} Product details complete</li><li>{gallery.some((item) => item.media_type === "image") ? "✓" : "○"} Cover image uploaded</li><li>{gallery.length ? "✓" : "○"} Gallery available</li><li>{ready360 ? "✓" : "○"} 360 readiness</li></ul></div></div>;
}
