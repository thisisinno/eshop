"use client";
/* eslint-disable react/jsx-key -- DataTable supplies stable table-cell keys for render arrays. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api/client";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import type { ProductListItem } from "@/types/catalog";
import type { Order, OrderItemPayload, OrderListItem, OrderSource, OrderStatus, PaymentStatus } from "@/types/orders";
import { ConfirmAction } from "./ConfirmAction";
import { DataTable } from "./DataTable";
import { PageHeader } from "./PageHeader";
import { StatCard } from "./StatCard";
import { StatusBadge } from "./StatusBadge";

const input = "w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white";
const card = "rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card";
const muted = "text-body-color dark:text-dark-6";
const statuses: OrderStatus[] = ["draft", "requested", "confirmed", "processing", "ready", "shipped", "delivered", "cancelled", "rejected"];
const paymentStatuses: PaymentStatus[] = ["unpaid", "pending", "paid", "refunded"];
const sources: OrderSource[] = ["admin", "web_pwa", "mobile_pwa", "api"];
const actionLabels = {
  confirm: "Confirm",
  process: "Process",
  ready: "Ready",
  ship: "Ship",
  deliver: "Deliver",
  cancel: "Cancel",
  reject: "Reject",
} as const;
const successLabels = {
  confirm: "Order confirmed.",
  process: "Order moved to processing.",
  ready: "Order marked ready.",
  ship: "Order shipped.",
  deliver: "Order delivered.",
  cancel: "Order cancelled.",
  reject: "Order rejected.",
} as const;
const validActions: Record<OrderStatus, (keyof typeof actionLabels)[]> = {
  draft: ["cancel"],
  requested: ["confirm", "reject", "cancel"],
  confirmed: ["process", "cancel"],
  processing: ["ready", "cancel"],
  ready: ["ship", "deliver", "cancel"],
  shipped: ["deliver", "cancel"],
  delivered: [],
  cancelled: [],
  rejected: [],
};

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Request failed.";
const money = (amount: string | number | null | undefined, currency = "TZS") => amount === null || amount === undefined || amount === "" ? "-" : `${currency} ${Number(amount).toLocaleString()}`;
const label = (value: string) => value.replaceAll("_", " ");

export function OrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [filters, setFilters] = useState({ search: "", status: "", payment_status: "", source: "", date_from: "", date_to: "", customer_phone: "", customer_email: "" });
  const set = (key: keyof typeof filters, value: string) => setFilters(current => ({ ...current, [key]: value }));
  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
      setOrders(await apiGet<OrderListItem[]>(`/orders/?${params.toString()}`));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);
  const action = async (order: OrderListItem, name: keyof typeof actionLabels) => {
    const key = `${order.id}:${name}`;
    setBusyAction(key);
    try {
      await apiPatch(`/orders/${order.id}/${name}/`, {});
      toast.success(successLabels[name]);
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };
  const remove = async (order: OrderListItem) => {
    setBusyAction(`${order.id}:delete`);
    try {
      await apiDelete(`/orders/${order.id}/`);
      toast.success("Order deleted.");
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };
  const count = (predicate: (order: OrderListItem) => boolean) => orders.filter(predicate).length;
  return <>
    <PageHeader title="Orders" description="Create, track, and manage customer order requests." action={{ href: "/orders/new", label: "Create Order" }} />
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard label="Total orders" value={orders.length} />
      <StatCard label="Requested" value={count(o => o.status === "requested")} />
      <StatCard label="Confirmed/Processing" value={count(o => ["confirmed", "processing"].includes(o.status))} />
      <StatCard label="Delivered" value={count(o => o.status === "delivered")} />
      <StatCard label="Cancelled/Rejected" value={count(o => ["cancelled", "rejected"].includes(o.status))} />
    </div>
    <div className={`${card} mb-6 grid gap-3 xl:grid-cols-9`}>
      <input className={input} value={filters.search} onChange={e => set("search", e.target.value)} placeholder="Search orders, customer, product" />
      <select className={input} value={filters.status} onChange={e => set("status", e.target.value)}><option value="">All statuses</option>{statuses.map(item => <option key={item} value={item}>{label(item)}</option>)}</select>
      <select className={input} value={filters.payment_status} onChange={e => set("payment_status", e.target.value)}><option value="">All payments</option>{paymentStatuses.map(item => <option key={item} value={item}>{label(item)}</option>)}</select>
      <select className={input} value={filters.source} onChange={e => set("source", e.target.value)}><option value="">All sources</option>{sources.map(item => <option key={item} value={item}>{label(item)}</option>)}</select>
      <input className={input} value={filters.customer_phone} onChange={e => set("customer_phone", e.target.value)} placeholder="Phone" />
      <input className={input} value={filters.customer_email} onChange={e => set("customer_email", e.target.value)} placeholder="Email" />
      <input className={input} type="date" value={filters.date_from} onChange={e => set("date_from", e.target.value)} />
      <input className={input} type="date" value={filters.date_to} onChange={e => set("date_to", e.target.value)} />
      <button className="rounded-[5px] bg-primary px-5 py-3 font-medium text-white disabled:opacity-60" disabled={loading} onClick={() => void load()}>Filter</button>
    </div>
    <DataTable columns={["Order", "Customer", "Contact", "Lines", "Qty", "Total", "Status", "Payment", "Source", "Created", "Actions"]} rows={orders} empty={loading ? "Loading orders..." : "No orders found."} render={order => [
      <Link className="font-medium text-primary hover:underline" href={`/orders/${order.id}`}>{order.order_number}</Link>,
      order.customer_full_name,
      <span>{order.customer_phone}<br /><span className="text-xs">{order.customer_email || "-"}</span></span>,
      `${order.items_count} lines`,
      `${order.total_quantity} units`,
      money(order.total_amount, order.currency),
      <StatusBadge value={order.status} />,
      <StatusBadge value={order.payment_status} />,
      label(order.source),
      new Date(order.created_at).toLocaleString(),
      <div className="flex flex-wrap gap-2 text-xs">
        <Link className="text-primary hover:underline" href={`/orders/${order.id}`}>View</Link>
        <Link className="text-primary hover:underline" href={`/orders/${order.id}/edit`}>Edit</Link>
        {validActions[order.status].filter(name => !["cancel", "reject"].includes(name)).map(name => <button key={name} className="text-primary hover:underline disabled:opacity-50" disabled={busyAction === `${order.id}:${name}`} onClick={() => void action(order, name)}>{actionLabels[name]}</button>)}
        {validActions[order.status].includes("cancel") && <ConfirmAction label="Cancel" message={`Cancel ${order.order_number}?`} className="text-orange hover:underline" onConfirm={() => action(order, "cancel")} />}
        {validActions[order.status].includes("reject") && <ConfirmAction label="Reject" message={`Reject ${order.order_number}?`} className="text-red hover:underline" onConfirm={() => action(order, "reject")} />}
        <ConfirmAction label="Delete" message={`Delete ${order.order_number}? This cannot be undone.`} className="text-red hover:underline" onConfirm={() => remove(order)} />
      </div>,
    ]} />
  </>;
}

type FormState = { customer_full_name: string; customer_phone: string; customer_email: string; customer_country: string; customer_region: string; customer_district: string; customer_ward: string; customer_street: string; customer_address: string; delivery_note: string; admin_note: string; source: OrderSource; status: OrderStatus; payment_status: PaymentStatus; currency: string; delivery_fee: string; allow_price_override: boolean; };
type ItemRow = { id?: number; product: string; quantity: string; unit_price: string; line_discount: string; note: string; image?: string | null; name?: string; sku?: string; };
type FieldErrors = Record<string, string>;
const emptyForm: FormState = { customer_full_name: "", customer_phone: "", customer_email: "", customer_country: "Tanzania", customer_region: "", customer_district: "", customer_ward: "", customer_street: "", customer_address: "", delivery_note: "", admin_note: "", source: "admin", status: "requested", payment_status: "unpaid", currency: "TZS", delivery_fee: "0", allow_price_override: false };
const emptyItem = (): ItemRow => ({ product: "", quantity: "1", unit_price: "", line_discount: "0", note: "", image: null, name: "", sku: "" });

export function OrderFormPage({ id }: { id?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(current => ({ ...current, [key]: value }));
  const applyOrder = (order: Order) => {
    setForm({ customer_full_name: order.customer_full_name, customer_phone: order.customer_phone, customer_email: order.customer_email, customer_country: order.customer_country, customer_region: order.customer_region, customer_district: order.customer_district, customer_ward: order.customer_ward, customer_street: order.customer_street, customer_address: order.customer_address, delivery_note: order.delivery_note, admin_note: order.admin_note, source: order.source, status: order.status, payment_status: order.payment_status, currency: order.currency, delivery_fee: order.delivery_fee, allow_price_override: false });
    setItems(order.items.length ? order.items.map(item => ({ id: item.id, product: item.product ? String(item.product) : "", quantity: String(item.quantity), unit_price: item.unit_price, line_discount: item.line_discount, note: item.note, image: item.product_media_url, name: item.product_name_snapshot, sku: item.product_sku_snapshot })) : [emptyItem()]);
  };
  useEffect(() => { const load = async () => { try { setProducts(await apiGet<ProductListItem[]>("/catalog/products/")); if (id) applyOrder(await apiGet<Order>(`/orders/${id}/`)); } catch (error) { toast.error(errorMessage(error)); } finally { setLoading(false); } }; void load(); }, [id]);
  const updateItem = (index: number, patch: Partial<ItemRow>) => setItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const selectProduct = (index: number, productId: string) => {
    const product = products.find(item => String(item.id) === productId);
    updateItem(index, { product: productId, unit_price: product?.price || "", image: product?.primary_media_url || null, name: product?.name || "", sku: product?.sku || "" });
  };
  const productOptions = useMemo(() => products.map(product => <option key={product.id} value={product.id}>{product.name} {product.sku ? `(${product.sku})` : ""}</option>), [products]);
  const parsedItems = items.filter(item => item.product || item.name || item.unit_price || item.note);
  const subtotal = parsedItems.reduce((sum, item) => sum + Math.max((Number(item.quantity) || 0) * (Number(item.unit_price) || 0) - (Number(item.line_discount) || 0), 0), 0);
  const discount = parsedItems.reduce((sum, item) => sum + (Number(item.line_discount) || 0), 0);
  const total = Math.max(subtotal + (Number(form.delivery_fee) || 0), 0);
  const validate = () => {
    const next: FieldErrors = {};
    if (!form.customer_full_name.trim()) next.customer_full_name = "Customer full name is required.";
    if (!form.customer_phone.trim()) next.customer_phone = "Phone is required.";
    const deliveryFee = Number(form.delivery_fee);
    if (!Number.isFinite(deliveryFee) || deliveryFee < 0) next.delivery_fee = "Delivery fee must be zero or greater.";
    if (form.status !== "draft" && parsedItems.length < 1) next.items = "At least one item is required.";
    parsedItems.forEach((item, index) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unit_price);
      const lineDiscount = Number(item.line_discount || "0");
      if (!item.product && !item.name?.trim()) next[`items.${index}.product`] = "Select a product or enter a product snapshot.";
      if (!Number.isInteger(quantity) || quantity < 1) next[`items.${index}.quantity`] = "Quantity must be at least 1.";
      if (!Number.isFinite(unitPrice) || unitPrice < 0) next[`items.${index}.unit_price`] = "Unit price must be zero or greater.";
      if (!Number.isFinite(lineDiscount) || lineDiscount < 0) next[`items.${index}.line_discount`] = "Discount must be zero or greater.";
      if (Number.isFinite(quantity) && Number.isFinite(unitPrice) && lineDiscount > quantity * unitPrice) next[`items.${index}.line_discount`] = "Discount cannot exceed the line amount.";
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        items: parsedItems.map<OrderItemPayload>(item => ({
          id: item.id,
          product: item.product ? Number(item.product) : null,
          product_name_snapshot: item.name,
          quantity: Number(item.quantity),
          unit_price: item.unit_price,
          line_discount: item.line_discount || "0",
          note: item.note,
        })),
      };
      const order = id ? await apiPut<Order>(`/orders/${id}/`, payload) : await apiPost<Order>("/orders/", payload);
      toast.success(id ? "Order updated." : "Order created.");
      router.push(`/orders/${order.id}`);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <div className={card}><div className="h-6 w-44 animate-pulse rounded bg-gray-2 dark:bg-dark-2" /><div className="mt-4 grid gap-4 md:grid-cols-2">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded bg-gray-2 dark:bg-dark-2" />)}</div></div>;
  return <>
    <PageHeader title={id ? "Edit Order" : "Create Order"} description="Capture customer details and requested product items." action={{ href: "/orders", label: "Back to orders" }} />
    <form onSubmit={submit} className="space-y-6">
      <section className={card}>
        <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Customer</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <TextField label="Customer full name" required error={errors.customer_full_name} value={form.customer_full_name} onChange={value => set("customer_full_name", value)} />
          <TextField label="Phone" required error={errors.customer_phone} value={form.customer_phone} onChange={value => set("customer_phone", value)} />
          <TextField label="Email" type="email" value={form.customer_email} onChange={value => set("customer_email", value)} />
          <TextField label="Country" value={form.customer_country} onChange={value => set("customer_country", value)} />
        </div>
      </section>
      <section className={card}>
        <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Delivery</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <TextField label="Region" value={form.customer_region} onChange={value => set("customer_region", value)} />
          <TextField label="District" value={form.customer_district} onChange={value => set("customer_district", value)} />
          <TextField label="Ward" value={form.customer_ward} onChange={value => set("customer_ward", value)} />
          <TextField label="Street" value={form.customer_street} onChange={value => set("customer_street", value)} />
          <Field label="Address" className="md:col-span-2"><textarea className={`${input} min-h-20`} value={form.customer_address} onChange={e => set("customer_address", e.target.value)} /></Field>
          <Field label="Delivery note"><textarea className={`${input} min-h-20`} value={form.delivery_note} onChange={e => set("delivery_note", e.target.value)} /></Field>
          <Field label="Admin note"><textarea className={`${input} min-h-20`} value={form.admin_note} onChange={e => set("admin_note", e.target.value)} /></Field>
        </div>
      </section>
      <section className={card}>
        <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Order</h2>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Status"><select className={input} value={form.status} onChange={e => set("status", e.target.value as OrderStatus)} disabled={Boolean(id)}>{statuses.map(item => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
          <Field label="Payment"><select className={input} value={form.payment_status} onChange={e => set("payment_status", e.target.value as PaymentStatus)}>{paymentStatuses.map(item => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
          <Field label="Source"><select className={input} value={form.source} onChange={e => set("source", e.target.value as OrderSource)}>{sources.map(item => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
          <TextField label="Currency" value={form.currency} onChange={value => set("currency", value)} />
          <TextField label="Delivery fee" type="number" error={errors.delivery_fee} value={form.delivery_fee} onChange={value => set("delivery_fee", value)} />
        </div>
        <label className="mt-4 flex items-center gap-3 text-sm text-dark dark:text-white"><input type="checkbox" checked={form.allow_price_override} onChange={e => set("allow_price_override", e.target.checked)} />Allow admin price override</label>
      </section>
      <section className={card}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-dark dark:text-white">Product items</h2>
          <button type="button" className="rounded-[5px] bg-primary px-4 py-2 text-sm font-medium text-white" onClick={() => setItems(current => [...current, emptyItem()])}>Add item</button>
        </div>
        {errors.items && <p className="mb-3 text-sm text-red">{errors.items}</p>}
        <div className="space-y-3">{items.map((item, index) => {
          const image = resolveMediaUrl(item.image);
          const lineTotal = Math.max((Number(item.quantity) || 0) * (Number(item.unit_price) || 0) - (Number(item.line_discount) || 0), 0);
          return <div key={item.id ?? index} className="grid gap-3 rounded-lg border border-stroke p-3 dark:border-dark-3 xl:grid-cols-[64px_2fr_1fr_1fr_1fr_1fr_1.2fr_auto]">
            <div>{image ? <img src={image} alt={item.name || "Product"} className="h-14 w-14 rounded object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded bg-gray-2 text-xs dark:bg-dark-2">No image</div>}</div>
            <div><select className={input} value={item.product} onChange={e => selectProduct(index, e.target.value)}><option value="">Select product</option>{productOptions}</select>{errors[`items.${index}.product`] && <ErrorText value={errors[`items.${index}.product`]} />}</div>
            <div><input aria-label="Quantity" className={input} type="number" min="1" value={item.quantity} onChange={e => updateItem(index, { quantity: e.target.value })} />{errors[`items.${index}.quantity`] && <ErrorText value={errors[`items.${index}.quantity`]} />}</div>
            <div><input aria-label="Unit price" className={input} type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(index, { unit_price: e.target.value })} />{errors[`items.${index}.unit_price`] && <ErrorText value={errors[`items.${index}.unit_price`]} />}</div>
            <div><input aria-label="Discount" className={input} type="number" min="0" step="0.01" value={item.line_discount} onChange={e => updateItem(index, { line_discount: e.target.value })} />{errors[`items.${index}.line_discount`] && <ErrorText value={errors[`items.${index}.line_discount`]} />}</div>
            <div className="rounded-lg bg-gray-1 px-4 py-3 text-sm font-medium dark:bg-dark-2">{money(lineTotal, form.currency)}</div>
            <input className={input} value={item.note} onChange={e => updateItem(index, { note: e.target.value })} placeholder="Note" />
            <ConfirmAction label="Remove" message={`Remove ${item.name || "this item"}?`} className="text-red hover:underline disabled:opacity-50" onConfirm={() => setItems(current => current.length === 1 ? [emptyItem()] : current.filter((_, itemIndex) => itemIndex !== index))} />
          </div>;
        })}</div>
      </section>
      <section className={card}>
        <div className="grid gap-2 text-sm md:max-w-sm md:ml-auto">
          <Detail label="Subtotal" value={money(subtotal + discount, form.currency)} />
          <Detail label="Discount" value={money(discount, form.currency)} />
          <Detail label="Delivery" value={money(form.delivery_fee, form.currency)} />
          <div className="mt-2 flex justify-between border-t border-stroke pt-3 text-lg font-bold text-dark dark:border-dark-3 dark:text-white"><span>Total</span><span>{money(total, form.currency)}</span></div>
        </div>
        <button disabled={saving} className="mt-6 rounded-[5px] bg-primary px-6 py-3 font-medium text-white disabled:opacity-60">{saving ? "Saving..." : id ? "Save changes" : "Create Order"}</button>
      </section>
    </form>
  </>;
}

export function OrderDetailPage({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  useEffect(() => { void apiGet<Order>(`/orders/${id}/`).then(setOrder).catch(error => toast.error(errorMessage(error))); }, [id]);
  if (!order) return <div className={card}><div className="h-6 w-48 animate-pulse rounded bg-gray-2 dark:bg-dark-2" /></div>;
  return <>
    <PageHeader title={order.order_number} description={`${order.customer_full_name} - ${order.customer_phone}`} action={<div className="flex gap-3"><Link href={`/orders/${order.id}/edit`} className="rounded-[5px] bg-primary px-5 py-3 font-medium text-white">Edit</Link><Link href="/orders" className="rounded-[5px] border border-stroke px-5 py-3 font-medium">Back</Link></div>} />
    <div className="grid gap-6 xl:grid-cols-3">
      <section className={card}><h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Customer details</h2><dl className="grid gap-3 text-sm"><Detail label="Name" value={order.customer_full_name} /><Detail label="Phone" value={order.customer_phone} /><Detail label="Email" value={order.customer_email || "-"} /><Detail label="Username" value={order.customer_username || "-"} /></dl></section>
      <section className={card}><h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Order summary</h2><dl className="grid gap-3 text-sm"><BadgeDetail labelText="Status" value={order.status} /><BadgeDetail labelText="Payment" value={order.payment_status} /><Detail label="Source" value={label(order.source)} /><Detail label="Lines" value={String(order.items_count)} /><Detail label="Quantity" value={String(order.total_quantity)} /><Detail label="Subtotal" value={money(order.subtotal_amount, order.currency)} /><Detail label="Discount" value={money(order.discount_amount, order.currency)} /><Detail label="Delivery" value={money(order.delivery_fee, order.currency)} /><Detail label="Total" value={money(order.total_amount, order.currency)} /></dl></section>
      <section className={card}><h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Delivery details</h2><dl className="grid gap-3 text-sm"><Detail label="Location" value={[order.customer_region, order.customer_district, order.customer_ward, order.customer_street].filter(Boolean).join(", ") || "-"} /><Detail label="Address" value={order.customer_address || "-"} /><Detail label="Delivery note" value={order.delivery_note || "-"} /><Detail label="Admin note" value={order.admin_note || "-"} /></dl></section>
      <section className={`${card} xl:col-span-3`}><h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Product items</h2><DataTable columns={["Product snapshot", "Quantity", "Unit price", "Discount", "Total", "Trader", "Branch", "Note"]} rows={order.items} empty="No items." render={item => { const image = resolveMediaUrl(item.product_media_url); return [<div className="flex min-w-52 items-center gap-3">{image ? <img src={image} alt={item.product_name_snapshot} className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-gray-2 dark:bg-dark-2" />}<span>{item.product_name_snapshot}<br /><span className="text-xs">{item.product_sku_snapshot || item.product_id_snapshot || (item.product ? `Product #${item.product}` : "Deleted or custom product")}</span></span></div>, item.quantity, money(item.unit_price, order.currency), money(item.line_discount, order.currency), money(item.line_total, order.currency), item.trader_name_snapshot || "-", item.branch_name_snapshot || "-", item.note || "-"]; }} /></section>
      <section className={`${card} xl:col-span-2`}><h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Status history</h2><DataTable columns={["Time", "From", "To", "By", "Note"]} rows={order.status_history} empty="No status changes yet." render={item => [new Date(item.created_at).toLocaleString(), item.from_status || "-", <StatusBadge value={item.to_status} />, item.changed_by_name || "-", item.note || "-"]} /></section>
      <section className={card}><h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Audit details</h2><dl className="grid gap-3 text-sm"><Detail label="Created by" value={order.created_by_name || "-"} /><Detail label="Updated by" value={order.updated_by_name || "-"} /><Detail label="Confirmed by" value={order.confirmed_by_name || "-"} /><Detail label="Created" value={new Date(order.created_at).toLocaleString()} /><Detail label="Updated" value={new Date(order.updated_at).toLocaleString()} /><Detail label="Confirmed" value={order.confirmed_at ? new Date(order.confirmed_at).toLocaleString() : "-"} /><Detail label="Delivered" value={order.delivered_at ? new Date(order.delivered_at).toLocaleString() : "-"} /><Detail label="Cancelled" value={order.cancelled_at ? new Date(order.cancelled_at).toLocaleString() : "-"} /><Detail label="IP" value={order.requested_ip_address || "-"} /><Detail label="Device" value={order.requested_device || "-"} /><Detail label="Browser" value={order.requested_browser || "-"} /><Detail label="OS" value={order.requested_os || "-"} /></dl></section>
    </div>
  </>;
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) { return <label className={className}><span className="text-sm font-medium text-dark dark:text-white">{label}</span><div className="mt-2">{children}</div></label>; }
function TextField({ label: fieldLabel, value, onChange, type = "text", required, error }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; error?: string }) { return <Field label={fieldLabel}><input required={required} type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? "0.01" : undefined} className={input} value={value} onChange={e => onChange(e.target.value)} />{error && <ErrorText value={error} />}</Field>; }
function ErrorText({ value }: { value: string }) { return <p className="mt-1 text-xs text-red">{value}</p>; }
function Detail({ label: detailLabel, value }: { label: string; value: string }) { return <div className="flex justify-between gap-3"><dt className={muted}>{detailLabel}</dt><dd className="text-right font-medium text-dark dark:text-white">{value}</dd></div>; }
function BadgeDetail({ labelText, value }: { labelText: string; value: string }) { return <div className="flex items-center justify-between gap-3"><dt className={muted}>{labelText}</dt><dd><StatusBadge value={value} /></dd></div>; }
