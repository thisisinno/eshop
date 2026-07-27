"use client";
/* eslint-disable react/jsx-key -- DataTable supplies stable table-cell keys for render arrays. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api/client";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import type { TraderBranch, TraderProfile } from "@/types/registration";
import type {
  Product,
  ProductCategory,
  ProductListItem,
  ProductMedia,
  ProductSpecificationGroup,
  ProductStatus,
} from "@/types/catalog";
import { ConfirmAction } from "./ConfirmAction";
import { DataTable } from "./DataTable";
import { PageHeader } from "./PageHeader";
import { StatCard } from "./StatCard";
import { StatusBadge } from "./StatusBadge";

const input =
  "w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white";
const card =
  "rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card";
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Request failed.";
const money = (amount: string | null | undefined, currency = "TZS") =>
  amount === null || amount === undefined
    ? "—"
    : `${currency} ${Number(amount).toLocaleString()}`;
const statuses: ProductStatus[] = [
  "draft",
  "pending_review",
  "active",
  "rejected",
  "out_of_stock",
  "archived",
];

function orderedCategoryTree(items: ProductCategory[]) {
  const children = new Map<number | null, ProductCategory[]>();
  for (const item of items) {
    const siblings = children.get(item.parent) ?? [];
    siblings.push(item);
    children.set(item.parent, siblings);
  }
  for (const siblings of children.values()) {
    siblings.sort(
      (a, b) =>
        a.display_order - b.display_order || a.name.localeCompare(b.name),
    );
  }
  const result: Array<{ category: ProductCategory; depth: number }> = [];
  const visited = new Set<number>();
  function visit(parent: number | null, depth: number) {
    for (const category of children.get(parent) ?? []) {
      if (visited.has(category.id)) continue;
      visited.add(category.id);
      result.push({ category, depth });
      visit(category.id, depth + 1);
    }
  }
  visit(null, 0);
  for (const category of items) {
    if (!visited.has(category.id)) result.push({ category, depth: 0 });
  }
  return result;
}

function descendantCategoryIds(items: ProductCategory[], categoryId: number) {
  const descendants = new Set<number>();
  const pending = [categoryId];
  while (pending.length) {
    const parent = pending.pop();
    for (const item of items) {
      if (item.parent !== parent || descendants.has(item.id)) continue;
      descendants.add(item.id);
      pending.push(item.id);
    }
  }
  return descendants;
}

export function ProductsPage() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [traders, setTraders] = useState<TraderProfile[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [trader, setTrader] = useState("");
  const [category, setCategory] = useState("");
  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      [
        ["search", search],
        ["status", status],
        ["trader", trader],
        ["category", category],
      ].forEach(([key, value]) => value && params.set(key, value));
      setProducts(
        await apiGet<ProductListItem[]>(`/catalog/products/?${params}`),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    void apiGet<TraderProfile[]>("/registration/traders/")
      .then(setTraders)
      .catch(() => undefined);
    void apiGet<ProductCategory[]>("/catalog/categories/")
      .then(setCategories)
      .catch(() => undefined);
  }, []);
  const action = async (
    product: ProductListItem,
    name: "approve" | "feature" | "archive",
  ) => {
    try {
      await apiPatch(
        `/catalog/products/${product.id}/${name}/`,
        name === "feature" ? { is_featured: !product.is_featured } : {},
      );
      toast.success(`Product ${name}d.`);
      void load();
    } catch (error) {
      toast.error(
        name === "approve"
          ? `Cannot approve product. ${errorMessage(error)}`
          : errorMessage(error),
        name === "approve" ? { duration: 9000 } : undefined,
      );
    }
  };
  const remove = async (product: ProductListItem) => {
    try {
      await apiDelete(`/catalog/products/${product.id}/`);
      toast.success("Product deleted.");
      void load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };
  const total = (predicate: (p: ProductListItem) => boolean) =>
    products.filter(predicate).length;
  return (
    <>
      <PageHeader
        title="Product Management"
        description="Manage products, prices, media, and store ownership."
        action={{ href: "/catalog/products/new", label: "Add Product" }}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total products" value={products.length} />
        <StatCard label="Active" value={total((p) => p.status === "active")} />
        <StatCard
          label="Pending review"
          value={total((p) => p.status === "pending_review")}
        />
        <StatCard label="Discounted" value={total((p) => p.has_discount)} />
        <StatCard
          label="Out of stock"
          value={total((p) => p.status === "out_of_stock")}
        />
      </div>
      <div className={`${card} mb-6 grid gap-3 lg:grid-cols-5`}>
        <input
          className={input}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search product ID, name, SKU, business"
        />
        <select
          className={input}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select
          className={input}
          value={trader}
          onChange={(e) => setTrader(e.target.value)}
        >
          <option value="">All businesses</option>
          {traders.map((item) => (
            <option key={item.id} value={item.id}>
              {item.business_name}
            </option>
          ))}
        </select>
        <select
          className={input}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => void load()}
          className="rounded-[5px] bg-primary px-5 py-3 font-medium text-white"
        >
          Filter
        </button>
      </div>
      <DataTable
        columns={[
          "Product",
          "Product ID",
          "Business / Store",
          "Price",
          "Stock",
          "Position",
          "Status",
          "Media",
          "Actions",
        ]}
        rows={products}
        empty={loading ? "Loading products…" : "No products found."}
        render={(product) => {
          const imageUrl = resolveMediaUrl(product.primary_media_url);
          return [
            <div className="flex min-w-44 items-center gap-3">
              {imageUrl ? (
                <PreviewImage
                  className="h-10 w-10 rounded object-cover"
                  src={imageUrl}
                  alt=""
                  fallbackText="No preview"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-2 text-xs dark:bg-dark-2">
                  No preview
                </div>
              )}
              <Link
                className="font-medium text-primary hover:underline"
                href={`/catalog/products/${product.id}`}
              >
                {product.name}
              </Link>
            </div>,
            product.product_id,
            <span>
              {product.trader_name}
              <br />
              <span className="text-xs">
                {product.branch_name || "All stores"}
              </span>
            </span>,
            <Price product={product} />,
            product.stock_quantity,
            product.position,
            <StatusBadge value={product.status} />,
            product.media_count,
            <div className="flex flex-wrap gap-2 text-xs">
              <Link
                className="text-primary hover:underline"
                href={`/catalog/products/${product.id}`}
              >
                View
              </Link>
              <Link
                className="text-primary hover:underline"
                href={`/catalog/products/${product.id}/edit`}
              >
                Edit
              </Link>
              {product.status === "pending_review" && (
                <button
                  className="text-green hover:underline"
                  onClick={() => void action(product, "approve")}
                >
                  Approve
                </button>
              )}
              <button
                className="text-primary hover:underline"
                onClick={() => void action(product, "feature")}
              >
                {product.is_featured ? "Unfeature" : "Feature"}
              </button>
              <ConfirmAction
                label="Archive"
                message={`Archive ${product.name}?`}
                className="text-orange hover:underline"
                onConfirm={() => action(product, "archive")}
              />
              <ConfirmAction
                label="Delete"
                message={`Delete ${product.name} and its media? This cannot be undone.`}
                className="text-red hover:underline"
                onConfirm={() => remove(product)}
              />
            </div>,
          ];
        }}
      />
    </>
  );
}

function Price({
  product,
}: {
  product: Pick<
    ProductListItem,
    | "price"
    | "compare_at_price"
    | "currency"
    | "has_discount"
    | "discount_percent"
  >;
}) {
  return (
    <div>
      <div className="font-medium">
        {money(product.price, product.currency)}
      </div>
      {product.has_discount && (
        <div className="flex gap-2 text-xs">
          <span className="text-gray-500 line-through">
            {money(product.compare_at_price, product.currency)}
          </span>
          <span className="rounded bg-green/10 px-1 text-green">
            -{product.discount_percent}%
          </span>
        </div>
      )}
    </div>
  );
}

type SpecRow = { key: string; value: string };
type FormValues = {
  trader: string;
  branch: string;
  category: string;
  name: string;
  sku: string;
  short_description: string;
  description: string;
  price: string;
  compare_at_price: string;
  cost_price: string;
  currency: string;
  delivery_fee: string;
  stock_quantity: string;
  minimum_order_quantity: string;
  unit: string;
  specifications: SpecRow[];
  has_selectable_specifications: boolean;
  specification_groups: ProductSpecificationGroup[];
  view_360_enabled: boolean;
  view_360_mode: "spin" | "model";
  status: ProductStatus;
  is_featured: boolean;
  is_discountable: boolean;
  position: string;
  related_products: number[];
};
const emptyForm: FormValues = {
  trader: "",
  branch: "",
  category: "",
  name: "",
  sku: "",
  short_description: "",
  description: "",
  price: "",
  compare_at_price: "",
  cost_price: "",
  currency: "TZS",
  delivery_fee: "0",
  stock_quantity: "",
  minimum_order_quantity: "1",
  unit: "",
  specifications: [{ key: "", value: "" }],
  has_selectable_specifications: false,
  specification_groups: [],
  view_360_enabled: false,
  view_360_mode: "spin",
  status: "draft",
  is_featured: false,
  is_discountable: true,
  position: "",
  related_products: [],
};
const specsToRows = (specifications: Record<string, unknown>) => {
  const rows = Object.entries(specifications || {}).map(([key, value]) => ({
    key,
    value: String(value ?? ""),
  }));
  return rows.length ? rows : [{ key: "", value: "" }];
};
const rowsToSpecs = (rows: SpecRow[]) =>
  Object.fromEntries(
    rows
      .map((item) => [item.key.trim(), item.value.trim()])
      .filter(([key, value]) => key && value),
  );

export function ProductFormPage({
  id,
  mode = "create",
}: {
  id?: string;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const isEditing = mode === "edit";
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [traders, setTraders] = useState<TraderProfile[]>([]);
  const [branches, setBranches] = useState<TraderBranch[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [spinFiles, setSpinFiles] = useState<File[]>([]);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [existingMedia, setExistingMedia] = useState<ProductMedia[]>([]);
  const [loadedProduct, setLoadedProduct] = useState<Product | null>(null);
  const [previewUrls, setPreviewUrls] = useState<
    { file: File; url: string; type: "image" | "clip" }[]
  >([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [reorderBusy, setReorderBusy] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const applyProduct = (product: Product) => {
    setLoadedProduct(product);
    setForm({
      trader: String(product.trader),
      branch: product.branch ? String(product.branch) : "",
      category: product.category ? String(product.category) : "",
      name: product.name,
      sku: product.sku,
      short_description: product.short_description,
      description: product.description,
      price: product.price,
      compare_at_price: product.compare_at_price || "",
      cost_price: product.cost_price || "",
      currency: product.currency,
      delivery_fee: product.delivery_fee || "0",
      stock_quantity: String(product.stock_quantity),
      minimum_order_quantity: String(product.minimum_order_quantity),
      unit: product.unit,
      specifications: specsToRows(product.specifications),
      has_selectable_specifications: product.has_selectable_specifications,
      specification_groups: product.specification_groups,
      view_360_enabled: product.view_360_enabled,
      view_360_mode: product.view_360_mode,
      status: product.status,
      is_featured: product.is_featured,
      is_discountable: product.is_discountable,
      position: String(product.position),
      related_products: product.related_products.map((item) => item.id),
    });
    setExistingMedia(product.media);
  };
  const refetchProduct = async () => {
    if (!id) return;
    applyProduct(await apiGet<Product>(`/catalog/products/${id}/`));
  };
  useEffect(() => {
    const load = async () => {
      try {
        const [traderData, branchData, categoryData, productData] =
          await Promise.all([
            apiGet<TraderProfile[]>("/registration/traders/"),
            apiGet<TraderBranch[]>("/registration/branches/"),
            apiGet<ProductCategory[]>("/catalog/categories/"),
            apiGet<ProductListItem[]>("/catalog/products/"),
          ]);
        setTraders(traderData);
        setBranches(branchData);
        setCategories(categoryData);
        setProducts(productData);
        if (id) applyProduct(await apiGet<Product>(`/catalog/products/${id}/`));
      } catch (error) {
        toast.error(errorMessage(error));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);
  useEffect(() => {
    const previews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      type: /\.(mp4|mov|webm)$/i.test(file.name)
        ? ("clip" as const)
        : ("image" as const),
    }));
    setPreviewUrls(previews);
    return () => previews.forEach((item) => URL.revokeObjectURL(item.url));
  }, [files]);
  const filteredBranches = useMemo(
    () => branches.filter((branch) => String(branch.trader) === form.trader),
    [branches, form.trader],
  );
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const mediaTypeForFile = (file: File) =>
    /\.(mp4|mov|webm)$/i.test(file.name) ? "clip" : "image";
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const stock = Number(form.stock_quantity);
    const minimum = Number(form.minimum_order_quantity);
    if (form.stock_quantity.trim() === "" || !Number.isInteger(stock) || stock < 0) {
      toast.error("Enter a valid whole-number stock quantity.");
      return;
    }
    if (!Number.isInteger(minimum) || minimum < 1) {
      toast.error("Minimum order quantity must be at least 1.");
      return;
    }
    if (form.status === "active" && (stock <= 0 || stock < minimum)) {
      toast.error(stock <= 0 ? "Add stock before activating this product." : "Stock quantity must be at least the minimum order quantity.");
      return;
    }
    setSaving(true);
    setUploadStatus("Saving product…");
    try {
      const makeProductData = (overrides: Partial<FormValues> = {}) => {
        const data = new FormData();
        Object.entries({ ...form, ...overrides }).forEach(([key, value]) => {
        if (key === "related_products")
          (value as number[]).forEach((item) => data.append(key, String(item)));
        else if (key === "specifications")
          data.set(key, JSON.stringify(rowsToSpecs(value as SpecRow[])));
        else if (key === "specification_groups")
          data.set(key, JSON.stringify(value));
        else if (typeof value === "boolean") data.set(key, String(value));
        else if (typeof value === "string" && value !== "")
          data.set(key, value);
        });
        return data;
      };
      const desiredStatus = form.status;
      const stagingOverrides: Partial<FormValues> = id
        ? {
            status: loadedProduct?.status || "draft",
            ...(loadedProduct?.status === "active"
              ? {
                  view_360_enabled: loadedProduct.view_360_enabled,
                  view_360_mode: loadedProduct.view_360_mode,
                }
              : {}),
          }
        : { status: "draft" };
      let product = id
        ? await apiPut<Product>(`/catalog/products/${id}/`, makeProductData(stagingOverrides))
        : await apiPost<Product>("/catalog/products/", makeProductData(stagingOverrides));
      const failedUploads: string[] = [];
      const existingCustomerMedia = existingMedia.filter((item) =>
        ["image", "clip", "poster"].includes(item.media_type),
      );
      const nextCustomerSortOrder = existingCustomerMedia.length
        ? Math.max(...existingCustomerMedia.map((item) => item.sort_order)) + 1
        : 0;
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setUploadStatus(`Uploading media ${index + 1} of ${files.length}…`);
        const media = new FormData();
        media.set("file", file);
        media.set("media_type", mediaTypeForFile(file));
        media.set("sort_order", String(nextCustomerSortOrder + index));
        try {
          await apiPost(`/catalog/products/${product.id}/media/`, media);
        } catch (error) {
          failedUploads.push(`${file.name} — ${errorMessage(error)}`);
        }
      }
      const existingSpinIndices = existingMedia
        .filter((item) => item.media_type === "spin_frame" && item.frame_index !== null)
        .map((item) => item.frame_index as number);
      const nextSpinIndex = existingSpinIndices.length ? Math.max(...existingSpinIndices) + 1 : 0;
      const specializedUploads: Array<{ file: File; media_type: "spin_frame" | "model_3d" | "poster"; sort_order: number; frame_index?: number }> = [
        ...spinFiles.map((file, index) => ({ file, media_type: "spin_frame" as const, sort_order: nextSpinIndex + index, frame_index: nextSpinIndex + index })),
        ...(modelFile ? [{ file: modelFile, media_type: "model_3d" as const, sort_order: 0 }] : []),
        ...(posterFile ? [{ file: posterFile, media_type: "poster" as const, sort_order: customerSlides.length }] : []),
      ];
      for (const upload of specializedUploads) {
        const body = new FormData();
        body.set("file", upload.file);
        body.set("media_type", upload.media_type);
        body.set("sort_order", String(upload.sort_order));
        if (upload.frame_index !== undefined) body.set("frame_index", String(upload.frame_index));
        try { await apiPost(`/catalog/products/${product.id}/media/`, body); }
        catch (error) { failedUploads.push(`${upload.file.name} — ${errorMessage(error)}`); }
      }
      if (failedUploads.length === 0) {
        if (desiredStatus === "active" && product.status !== "active") {
          setUploadStatus("Validating activation readiness…");
          product = await apiPatch<Product>(
            `/catalog/products/${product.id}/approve/`,
          );
        } else {
          setUploadStatus("Saving final product settings…");
          product = await apiPut<Product>(
            `/catalog/products/${product.id}/`,
            makeProductData(),
          );
        }
      }
      if (id)
        await apiGet<Product>(`/catalog/products/${product.id}/`).then(
          applyProduct,
        );
      if (failedUploads.length)
        toast.warning(
          `Product saved without the requested final status because media upload failed: ${failedUploads.join("; ")}`,
        );
      else
        toast.success(
          id
            ? "Product updated successfully."
            : "Product created successfully.",
        );
      setUploadStatus("Opening product…");
      router.push(`/catalog/products/${product.id}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
      setUploadStatus("");
    }
  };
  const deleteMedia = async (media: ProductMedia) => {
    if (!id) return;
    try {
      await apiDelete(`/catalog/products/${id}/media/${media.id}/`);
      toast.success("Media deleted.");
      await refetchProduct();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };
  const setPrimaryMedia = async (media: ProductMedia) => {
    if (!id) return;
    try {
      await apiPatch(`/catalog/products/${id}/media/${media.id}/primary/`, {});
      toast.success("Primary media updated.");
      await refetchProduct();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };
  const replaceMedia = async (media: ProductMedia, file: File) => {
    if (!id) return;
    try {
      const data = new FormData();
      data.set("file", file);
      data.set("media_type", mediaTypeForFile(file));
      await apiPatch(`/catalog/products/${id}/media/${media.id}/`, data);
      toast.success("Media replaced.");
      await refetchProduct();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };
  const movePending = (index: number, direction: -1 | 1) =>
    setFiles((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const moveExisting = async (media: ProductMedia, direction: -1 | 1) => {
    if (!id || reorderBusy) return;
    const ordered = existingMedia
      .filter((item) => ["image", "clip", "poster"].includes(item.media_type))
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    const index = ordered.findIndex((item) => item.id === media.id);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    const previous = existingMedia;
    const normalized = ordered.map((item, position) => ({
      ...item,
      sort_order: position,
    }));
    setExistingMedia((current) =>
      current.map(
        (item) => normalized.find((updated) => updated.id === item.id) || item,
      ),
    );
    setReorderBusy(true);
    try {
      await Promise.all(
        normalized.map((item) =>
          apiPatch(`/catalog/products/${id}/media/${item.id}/`, {
            sort_order: item.sort_order,
          }),
        ),
      );
      toast.success("Customer slide order updated.");
      await refetchProduct();
    } catch (error) {
      setExistingMedia(previous);
      toast.error(`Could not update slide order: ${errorMessage(error)}`);
      await refetchProduct();
    } finally {
      setReorderBusy(false);
    }
  };
  if (loading) return <p>Loading product form…</p>;
  const previewDiscount =
    Number(form.compare_at_price) > Number(form.price) &&
    Number(form.price) > 0;
  const customerSlides = existingMedia
    .filter((item) => ["image", "clip", "poster"].includes(item.media_type))
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  const specializedMedia = existingMedia.filter(
    (item) => !["image", "clip", "poster"].includes(item.media_type),
  );
  const validSpinFrameCount = new Set(
    specializedMedia
      .filter((item) => item.media_type === "spin_frame" && item.frame_index !== null)
      .map((item) => item.frame_index),
  ).size;
  return (
    <>
      <PageHeader
        title={id ? "Edit Product" : "Add Product"}
        description={
          id
            ? "Update product details, ownership, and media."
            : "Create the product first, then upload its media to secure storage."
        }
        action={{ href: "/catalog/products", label: "Back to products" }}
      />
      <form onSubmit={submit} className={card}>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Business / trader">
            <select
              required
              className={input}
              value={form.trader}
              onChange={(e) => {
                set("trader", e.target.value);
                set("branch", "");
              }}
            >
              <option value="">Select business</option>
              {traders.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.business_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Branch / store">
            <select
              className={input}
              value={form.branch}
              onChange={(e) => set("branch", e.target.value)}
              disabled={!form.trader}
            >
              <option value="">All stores / no branch</option>
              {filteredBranches.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select
              className={input}
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              <option value="">No category</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <TextField
            label="Product name"
            value={form.name}
            onChange={(value) => set("name", value)}
            required
          />
          <TextField
            label="SKU"
            value={form.sku}
            onChange={(value) => set("sku", value)}
          />
          <TextField
            label="Currency"
            value={form.currency}
            onChange={(value) => set("currency", value)}
          />
          <TextField
            label="Price"
            type="number"
            value={form.price}
            onChange={(value) => set("price", value)}
            required
          />
          <TextField
            label="Compare-at price"
            type="number"
            value={form.compare_at_price}
            onChange={(value) => set("compare_at_price", value)}
            helper="Old price shown with strikethrough when discount is active"
          />
          <TextField
            label="Cost price"
            type="number"
            value={form.cost_price}
            onChange={(value) => set("cost_price", value)}
          />
          <TextField
            label="Delivery cost"
            type="number"
            value={form.delivery_fee}
            onChange={(value) => set("delivery_fee", value)}
            helper="Flat fee charged once per product line"
          />
          <TextField
            label="Stock quantity"
            type="number"
            value={form.stock_quantity}
            onChange={(value) => set("stock_quantity", value)}
            required
            helper="Stock must be at least the minimum order quantity for customers to buy this product."
          />
          <TextField
            label="Minimum order quantity"
            type="number"
            value={form.minimum_order_quantity}
            onChange={(value) => set("minimum_order_quantity", value)}
            required
          />
          {form.stock_quantity !== "" && Number(form.stock_quantity) <= 0 ? (
            <p className="text-sm font-medium text-orange md:col-span-2">Out of stock — Add to cart will be unavailable.</p>
          ) : form.stock_quantity !== "" && Number(form.stock_quantity) < Number(form.minimum_order_quantity) ? (
            <p className="text-sm font-medium text-orange md:col-span-2">Customers cannot currently order this product.</p>
          ) : null}
          <TextField
            label="Unit"
            value={form.unit}
            onChange={(value) => set("unit", value)}
            helper="For example: piece, kg, box, carton"
          />
          <SpecificationEditor
            rows={form.specifications}
            setRows={(rows) => set("specifications", rows)}
          />
          <SelectableSpecificationsEditor
            enabled={form.has_selectable_specifications}
            groups={form.specification_groups}
            onEnabled={(value) => set("has_selectable_specifications", value)}
            onChange={(value) => set("specification_groups", value)}
          />
          <Field label="Interactive product view" className="md:col-span-2" id="interactive-media">
            <label className="flex items-center gap-3 font-medium">
              <input type="checkbox" checked={form.view_360_enabled} onChange={(e) => set("view_360_enabled", e.target.checked)} />
              Enable 360 / 3D view
            </label>
            {form.view_360_enabled && (
              <div className="mt-3 rounded-lg border border-stroke p-4 dark:border-dark-3">
                <div className="flex flex-wrap gap-5">
                  <label className="flex items-center gap-2"><input type="radio" checked={form.view_360_mode === "spin"} onChange={() => set("view_360_mode", "spin")} />360 image spin</label>
                  <label className="flex items-center gap-2"><input type="radio" checked={form.view_360_mode === "model"} onChange={() => set("view_360_mode", "model")} />Interactive 3D model</label>
                </div>
                {form.view_360_mode === "spin" ? (
                  <div className="mt-4 text-sm">
                    <p className="font-medium">360° image spin</p>
                    <p className="mt-1">Photograph the product from the same distance and height while rotating it around its center. Keep lighting and background consistent.</p>
                    <p className="mt-2 font-medium">Minimum: 12 frames · Recommended: 24–36 frames</p>
                    <p className="mt-1">{validSpinFrameCount} / 12 minimum frames uploaded · {validSpinFrameCount >= 12 ? "Ready" : "Not ready"}</p>
                    <input className={`${input} mt-3`} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => setSpinFiles(Array.from(e.target.files || []))} />
                    {spinFiles.length ? <p className="mt-2 font-medium">{spinFiles.length} ordered frames selected for upload</p> : null}
                  </div>
                ) : (
                  <div className="mt-4 text-sm">
                    <p className="font-medium">Upload GLB model</p>
                    <p className="mt-1">Upload a GLB/glTF binary model. Customers can drag to rotate and zoom the product. Add a poster image for loading and unsupported devices.</p>
                    <p className="mt-2 font-medium">{specializedMedia.some((item) => item.media_type === "model_3d") ? "Model uploaded · Ready" : "No .GLB model uploaded · Not ready"}</p>
                    <input className={`${input} mt-3`} type="file" accept=".glb,model/gltf-binary" onChange={(e) => setModelFile(e.target.files?.[0] || null)} />
                    <label className="mt-3 block font-medium">Poster / preview image<input className={`${input} mt-1`} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPosterFile(e.target.files?.[0] || null)} /></label>
                  </div>
                )}
              </div>
            )}
          </Field>
          <Field label="Status">
            <select
              className={input}
              value={form.status}
              onChange={(e) => set("status", e.target.value as ProductStatus)}
            >
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <TextField
            label="Position"
            type="number"
            value={form.position}
            onChange={(value) => set("position", value)}
            helper="Leave empty to assign the next position automatically"
          />
          <Field label="Product gallery & slides" className="md:col-span-2">
            <input
              className={input}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
            <p className="mt-1 text-xs">
              Images and short videos appear to customers in this order. The first image is the cover.
            </p>
            {previewUrls.length > 0 && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {previewUrls.map((item, index) => (
                  <div
                    key={item.url}
                    className="rounded-lg border border-stroke p-2 dark:border-dark-3"
                  >
                    {item.type === "image" ? (
                      <PreviewImage
                        src={resolveMediaUrl(item.url)}
                        alt={item.file.name}
                        className="h-28 w-full rounded object-cover"
                      />
                    ) : (
                      <PreviewVideo
                        src={resolveMediaUrl(item.url)}
                        className="h-28 w-full rounded object-cover"
                        unavailableText="Clip preview unavailable"
                      />
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded bg-gray-2 px-2 py-1 text-[10px] dark:bg-dark-2">
                        Slide {index + 1}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-xs">
                        {item.file.name}
                      </p>
                      <span className="text-[10px] font-medium">
                        {item.type.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <button type="button" disabled={index === 0} aria-label={`Move ${item.file.name} earlier`} className="text-primary hover:underline disabled:opacity-40" onClick={() => movePending(index, -1)}>Move earlier</button>
                      <button type="button" disabled={index === files.length - 1} aria-label={`Move ${item.file.name} later`} className="text-primary hover:underline disabled:opacity-40" onClick={() => movePending(index, 1)}>Move later</button>
                      <button type="button" aria-label={`Remove ${item.file.name}`} className="text-red hover:underline" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {existingMedia.length > 0 && (
              <div className="mt-5">
                <p className="mb-1 text-sm font-medium">Customer slide order</p>
                <p className="mb-3 text-xs">Images and clips are shown together in swipe order.</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {customerSlides.map((media, index) => {
                    const mediaUrl = resolveMediaUrl(
                      media.file_url || media.file,
                    );
                    return (
                      <div
                        key={media.id}
                        className={`rounded-lg border border-stroke p-2 dark:border-dark-3 ${media.is_primary ? "ring-2 ring-primary" : ""}`}
                      >
                        {media.media_type === "image" ? (
                          <PreviewImage
                            src={mediaUrl}
                            alt={
                              media.alt_text ||
                              media.file_name ||
                              "Product media"
                            }
                            className="h-28 w-full rounded object-cover"
                          />
                        ) : (
                          <PreviewVideo
                            src={mediaUrl}
                            className="h-28 w-full rounded object-cover"
                            unavailableText="Clip preview unavailable"
                          />
                        )}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="rounded bg-gray-2 px-2 py-1 text-[10px] dark:bg-dark-2">{index + 1}</span>
                          <p className="truncate text-xs">
                            {media.title ||
                              media.file_name ||
                              media.file_key ||
                              media.file}
                          </p>
                          {media.is_primary && (
                            <span className="rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                              Primary / Cover
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <button
                            type="button"
                            className="text-primary hover:underline disabled:opacity-50"
                            disabled={media.is_primary || media.media_type !== "image"}
                            onClick={() => void setPrimaryMedia(media)}
                          >
                            Set cover
                          </button>
                          <button type="button" disabled={reorderBusy || index === 0} aria-label={`Move ${media.file_name || media.title || "media"} earlier`} className="text-primary hover:underline disabled:opacity-40" onClick={() => void moveExisting(media, -1)}>Move earlier</button>
                          <button type="button" disabled={reorderBusy || index === customerSlides.length - 1} aria-label={`Move ${media.file_name || media.title || "media"} later`} className="text-primary hover:underline disabled:opacity-40" onClick={() => void moveExisting(media, 1)}>Move later</button>
                          <label className="cursor-pointer text-primary hover:underline">
                            Replace
                            <input
                              type="file"
                              className="hidden"
                              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void replaceMedia(media, file);
                                e.currentTarget.value = "";
                              }}
                            />
                          </label>
                          <ConfirmAction
                            label="Delete"
                            message="Delete this media file?"
                            className="text-red hover:underline"
                            onConfirm={() => deleteMedia(media)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {specializedMedia.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 text-sm font-medium">360 and model media</p>
                    <div className="flex flex-wrap gap-2">{specializedMedia.map((media) => <span key={media.id} className="rounded border border-stroke px-3 py-2 text-xs dark:border-dark-3">{media.media_type.replaceAll("_", " ")} · {media.file_name || media.title || media.id}</span>)}</div>
                  </div>
                )}
              </div>
            )}
          </Field>
          <Field label="Short description" className="md:col-span-2">
            <textarea
              className={`${input} min-h-20`}
              value={form.short_description}
              onChange={(e) => set("short_description", e.target.value)}
            />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <textarea
              className={`${input} min-h-32`}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <Field label="Related products" className="md:col-span-2">
            <div className="grid max-h-48 grid-cols-1 gap-2 overflow-auto rounded border border-stroke p-3 md:grid-cols-2">
              {products
                .filter((product) => String(product.id) !== id)
                .map((product) => (
                  <label
                    key={product.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={form.related_products.includes(product.id)}
                      onChange={(e) =>
                        set(
                          "related_products",
                          e.target.checked
                            ? [...form.related_products, product.id]
                            : form.related_products.filter(
                                (item) => item !== product.id,
                              ),
                        )
                      }
                    />
                    {product.name}{" "}
                    <span className="text-xs">({product.product_id})</span>
                  </label>
                ))}
              {!products.length && (
                <p className="text-sm">No other products available yet.</p>
              )}
            </div>
          </Field>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => set("is_featured", e.target.checked)}
            />
            Featured product
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_discountable}
              onChange={(e) => set("is_discountable", e.target.checked)}
            />
            Discountable
          </label>
        </div>
        <div className="mt-6 rounded-lg bg-gray-1 p-4 dark:bg-dark-2">
          <p className="text-sm font-medium">Live price preview</p>
          <p className="mt-2 text-lg font-bold">
            {money(form.price || "0", form.currency)}
          </p>
          {previewDiscount && (
            <p className="text-sm">
              <span className="line-through">
                {money(form.compare_at_price, form.currency)}
              </span>{" "}
              <span className="ml-2 text-green">
                -
                {(
                  ((Number(form.compare_at_price) - Number(form.price)) /
                    Number(form.compare_at_price)) *
                  100
                ).toFixed(2)}
                %
              </span>
            </p>
          )}
        </div>
        <button
          disabled={saving}
          className="mt-6 rounded-[5px] bg-primary px-6 py-3 font-medium text-white disabled:opacity-60"
        >
          {saving
            ? uploadStatus || "Saving product…"
            : id
              ? "Save changes"
              : "Create product"}
        </button>
      </form>
    </>
  );
}

function Field({
  label,
  children,
  className = "",
  id,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <label className={className} id={id}>
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}
function TextField({
  label,
  value,
  onChange,
  type = "text",
  required,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  helper?: string;
}) {
  return (
    <Field label={label}>
      <input
        required={required}
        type={type}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
        className={input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {helper && <p className="mt-1 text-xs">{helper}</p>}
    </Field>
  );
}
function SpecificationEditor({
  rows,
  setRows,
}: {
  rows: SpecRow[];
  setRows: (rows: SpecRow[]) => void;
}) {
  return (
    <Field label="Informational specifications" className="md:col-span-2">
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <input
              aria-label="Specification name"
              className={input}
              placeholder="Brand"
              value={row.key}
              onChange={(event) =>
                setRows(
                  rows.map((item, rowIndex) =>
                    rowIndex === index
                      ? { ...item, key: event.target.value }
                      : item,
                  ),
                )
              }
            />
            <input
              aria-label="Specification value"
              className={input}
              placeholder="Apple"
              value={row.value}
              onChange={(event) =>
                setRows(
                  rows.map((item, rowIndex) =>
                    rowIndex === index
                      ? { ...item, value: event.target.value }
                      : item,
                  ),
                )
              }
            />
            <button
              type="button"
              disabled={rows.length === 1}
              className="rounded-[5px] border border-stroke px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-dark-3"
              onClick={() =>
                setRows(rows.filter((_, rowIndex) => rowIndex !== index))
              }
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 rounded-[5px] border border-stroke px-4 py-2 text-sm font-medium dark:border-dark-3"
        onClick={() => setRows([...rows, { key: "", value: "" }])}
      >
        + Add specification
      </button>
    </Field>
  );
}

function SelectableSpecificationsEditor({
  enabled, groups, onEnabled, onChange,
}: {
  enabled: boolean;
  groups: ProductSpecificationGroup[];
  onEnabled: (value: boolean) => void;
  onChange: (groups: ProductSpecificationGroup[]) => void;
}) {
  const patchGroup = (index: number, patch: Partial<ProductSpecificationGroup>) =>
    onChange(groups.map((group, groupIndex) => groupIndex === index ? { ...group, ...patch } : group));
  return <Field label="Selectable specifications" className="md:col-span-2">
    <label className="flex min-h-11 items-center gap-3 font-medium"><input type="checkbox" checked={enabled} onChange={(event) => onEnabled(event.target.checked)} className="h-5 w-5" />This product has selectable specifications</label>
    {enabled ? <div className="mt-3 space-y-4">
      {groups.map((group, groupIndex) => <section key={group.id ?? groupIndex} className="rounded-lg border border-stroke p-4 dark:border-dark-3">
        <div className="grid gap-3 md:grid-cols-4">
          <input className={input} aria-label="Group name" placeholder="Size, Color, Material" value={group.name} onChange={(event) => patchGroup(groupIndex, { name: event.target.value })} />
          <select className={input} aria-label="Selection mode" value={group.selection_mode} onChange={(event) => patchGroup(groupIndex, { selection_mode: event.target.value as "single" | "multiple" })}><option value="single">Single selection</option><option value="multiple">Multiple selection</option></select>
          <label className="flex items-center gap-2"><input type="checkbox" checked={group.is_required} onChange={(event) => patchGroup(groupIndex, { is_required: event.target.checked })} />Required</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={group.is_active} onChange={(event) => patchGroup(groupIndex, { is_active: event.target.checked })} />Active</label>
        </div>
        <div className="mt-3 space-y-2">{group.options.map((option, optionIndex) => <div key={option.id ?? optionIndex} className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
          <input className={input} aria-label="Option value" placeholder="XL" value={option.value} onChange={(event) => patchGroup(groupIndex, { options: group.options.map((row, rowIndex) => rowIndex === optionIndex ? { ...row, value: event.target.value } : row) })} />
          <input className={input} aria-label="Price adjustment" type="number" step="0.01" value={option.price_adjustment} onChange={(event) => patchGroup(groupIndex, { options: group.options.map((row, rowIndex) => rowIndex === optionIndex ? { ...row, price_adjustment: event.target.value } : row) })} />
          <label className="flex items-center gap-2"><input type="checkbox" checked={option.is_active} onChange={(event) => patchGroup(groupIndex, { options: group.options.map((row, rowIndex) => rowIndex === optionIndex ? { ...row, is_active: event.target.checked } : row) })} />Active</label>
          <button type="button" className="text-red" onClick={() => patchGroup(groupIndex, { options: group.options.filter((_, rowIndex) => rowIndex !== optionIndex) })}>Remove</button>
        </div>)}</div>
        <p className="mt-2 text-xs">Positive increases base price. Negative decreases it. Zero leaves price unchanged.</p>
        <div className="mt-3 flex gap-4"><button type="button" className="font-medium text-primary" onClick={() => patchGroup(groupIndex, { options: [...group.options, { value: "", price_adjustment: "0", is_active: true, display_order: group.options.length }] })}>+ Add option</button><button type="button" className="text-red" onClick={() => onChange(groups.filter((_, index) => index !== groupIndex))}>Remove group</button></div>
      </section>)}
      <button type="button" className="rounded-[5px] border border-stroke px-4 py-2 font-medium dark:border-dark-3" onClick={() => onChange([...groups, { name: "", selection_mode: "single", is_required: true, is_active: true, display_order: groups.length, options: [{ value: "", price_adjustment: "0", is_active: true, display_order: 0 }] }])}>+ Add specification group</button>
    </div> : null}
  </Field>;
}
function PreviewFallback({
  text,
  className,
  href,
}: {
  text: string;
  className?: string;
  href?: string | null;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 rounded bg-gray-2 px-2 text-center text-xs dark:bg-dark-2 ${className || ""}`}
    >
      <span>{text}</span>
      {href && (
        <a
          className="text-primary hover:underline"
          href={href}
          target="_blank"
          rel="noreferrer"
        >
          Open file
        </a>
      )}
    </div>
  );
}
function PreviewImage({
  src,
  alt,
  className,
  fallbackText = "Preview unavailable",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackText?: string;
}) {
  const resolvedSrc = resolveMediaUrl(src);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [resolvedSrc]);
  const onError = () => {
    if (process.env.NODE_ENV === "development")
      console.warn("Product image preview failed", resolvedSrc);
    setFailed(true);
  };
  return failed || !resolvedSrc ? (
    <PreviewFallback
      text={fallbackText}
      className={className}
      href={resolvedSrc}
    />
  ) : (
    <img src={resolvedSrc} alt={alt} className={className} onError={onError} />
  );
}
function PreviewVideo({
  src,
  className,
  unavailableText,
}: {
  src?: string | null;
  className?: string;
  unavailableText: string;
}) {
  const resolvedSrc = resolveMediaUrl(src);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [resolvedSrc]);
  const onError = () => {
    if (process.env.NODE_ENV === "development")
      console.warn("Product video preview failed", resolvedSrc);
    setFailed(true);
  };
  return failed || !resolvedSrc ? (
    <PreviewFallback
      text={unavailableText}
      className={className}
      href={resolvedSrc}
    />
  ) : (
    <video controls className={className} src={resolvedSrc} onError={onError}>
      Clip preview unavailable
    </video>
  );
}

export function ProductDetailPage({ id }: { id: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  useEffect(() => {
    void apiGet<Product>(`/catalog/products/${id}/`)
      .then(setProduct)
      .catch((error) => toast.error(errorMessage(error)));
  }, [id]);
  if (!product) return <p>Loading product…</p>;
  const images = product.media.filter((item) => item.media_type === "image");
  const clips = product.media.filter((item) => item.media_type === "clip");
  const mediaRecordsWithoutUrls =
    product.media.length > 0 &&
    product.media.every((item) => !resolveMediaUrl(item.file_url || item.file));
  return (
    <>
      <PageHeader
        title={product.name}
        description={`${product.product_id} • ${product.slug}`}
        action={
          <div className="flex gap-3">
            <Link
              href={`/catalog/products/${product.id}/edit`}
              className="rounded-[5px] bg-primary px-5 py-3 font-medium text-white"
            >
              Edit
            </Link>
            <Link
              href="/catalog/products"
              className="rounded-[5px] border border-stroke px-5 py-3 font-medium"
            >
              Back
            </Link>
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <section className={`${card} xl:col-span-2`}>
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-dark dark:text-white">
                Product details
              </h2>
              <p className="mt-1">
                {product.short_description || "No short description."}
              </p>
            </div>
            <StatusBadge value={product.status} />
          </div>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <Detail label="Business" value={product.trader_name} />
            <Detail
              label="Branch / store"
              value={product.branch_name || "All stores"}
            />
            <Detail label="Category" value={product.category_name || "—"} />
            <Detail
              label="Stock"
              value={`${product.stock_quantity} ${product.unit || "units"}`}
            />
            <Detail label="Position" value={String(product.position)} />
            <Detail label="SKU" value={product.sku || "—"} />
          </dl>
          <div className="mt-5">
            <h3 className="font-medium">Description</h3>
            <p className="mt-2 text-sm whitespace-pre-wrap">
              {product.description || "No description."}
            </p>
          </div>
          <div className="mt-5">
            <h3 className="font-medium">Specifications</h3>
            {Object.keys(product.specifications || {}).length ? (
              <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <Detail key={key} label={key} value={String(value)} />
                ))}
              </dl>
            ) : (
              <p className="mt-2 text-sm">No specifications.</p>
            )}
          </div>
        </section>
        <section className={card}>
          <h2 className="text-lg font-semibold text-dark dark:text-white">
            Price
          </h2>
          <div className="mt-4">
            <Price product={product} />
          </div>
          <p className="mt-4 text-sm">
            Minimum order: {product.minimum_order_quantity}
          </p>
          <p className="mt-2 text-sm">
            Featured: {product.is_featured ? "Yes" : "No"}
          </p>
          <p className="mt-2 text-sm">
            Delivery:{" "}
            {Number(product.delivery_fee) > 0
              ? money(product.delivery_fee, product.currency)
              : "Free"}
          </p>
        </section>
        <section className={`${card} xl:col-span-3`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-dark dark:text-white">
                Approval readiness
              </h2>
              <p className="mt-1 text-sm">
                Backend-validated requirements for making this product active.
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${product.approval_readiness.ready ? "bg-green/10 text-green" : "bg-orange/10 text-orange"}`}>
              {product.approval_readiness.ready ? "Ready" : "Not ready"}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
              <p className="font-medium">Product information</p>
              <p className="mt-1 text-sm">Configured for the current catalog workflow.</p>
            </div>
            <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
              <p className="font-medium">Selectable specifications</p>
              <p className="mt-1 text-sm">
                {product.approval_readiness.issues.some((issue) => /specification/i.test(issue))
                  ? "Not ready"
                  : "Ready"}
              </p>
            </div>
            <div className={`rounded-lg border p-4 dark:border-dark-3 ${product.approval_readiness.commerce.ready ? "border-stroke" : "border-orange"}`}>
              <p className="font-medium">{product.approval_readiness.commerce.ready ? "✓" : "✕"} Stock</p>
              <p className="mt-1 text-sm">Stock: {product.stock_quantity}</p>
              <p className="text-sm">Minimum order: {product.minimum_order_quantity}</p>
              {!product.approval_readiness.commerce.ready ? (
                <p className="mt-2 text-sm text-orange">
                  {product.stock_quantity <= 0
                    ? "Add stock before approving this product."
                    : "Stock is below the minimum order quantity."}
                </p>
              ) : null}
            </div>
          </div>
          {product.approval_readiness.interactive_view.enabled ? (
            <div className="mt-3 rounded-lg border border-stroke p-4 dark:border-dark-3">
              <p className="font-medium">Interactive view</p>
              {product.approval_readiness.interactive_view.mode === "spin" ? (
                <>
                  <p className="mt-1 text-sm">360° image spin</p>
                  <p className="mt-2 font-semibold">
                    {product.approval_readiness.interactive_view.frame_count} / {product.approval_readiness.interactive_view.minimum_frame_count} frames · {product.approval_readiness.interactive_view.ready ? "Ready" : "Not ready"}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm">3D model</p>
                  <p className="mt-2 font-semibold">
                    {product.approval_readiness.interactive_view.has_model ? "GLB model uploaded · Ready" : "No GLB model uploaded · Not ready"}
                  </p>
                </>
              )}
              {!product.approval_readiness.interactive_view.ready ? (
                <p className="mt-2 text-sm text-orange">
                  {product.approval_readiness.issues.find((issue) => /360|3D|GLB|frame/i.test(issue))}
                </p>
              ) : null}
            </div>
          ) : null}
          {!product.approval_readiness.ready ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={`/catalog/products/${product.id}/edit`} className="inline-block rounded-[5px] bg-primary px-5 py-3 font-medium text-white">
                Edit product
              </Link>
              {product.approval_readiness.interactive_view.enabled ? (
                <Link href={`/catalog/products/${product.id}/edit#interactive-media`} className="inline-block rounded-[5px] border border-stroke px-5 py-3 font-medium dark:border-dark-3">
                  Manage 360 media
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
        <section className={`${card} xl:col-span-2`}>
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">
            Media gallery
          </h2>
          {mediaRecordsWithoutUrls && (
            <p className="text-orange mb-3 text-sm">
              Media records exist, but preview URLs are not reachable. Open file
            </p>
          )}
          {images.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((media) => {
                const mediaUrl = resolveMediaUrl(media.file_url || media.file);
                return (
                  <div key={media.id}>
                    <PreviewImage
                      src={mediaUrl}
                      className={`h-44 w-full rounded object-cover ${media.is_primary ? "ring-2 ring-primary" : ""}`}
                      alt={media.alt_text || product.name}
                      fallbackText="Media records exist, but preview URLs are not reachable."
                    />
                    <p className="mt-2 truncate text-xs">
                      {media.title ||
                        media.file_name ||
                        media.file_key ||
                        media.file}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p>No images uploaded.</p>
          )}
          {clips.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 font-medium">Clips</h3>
              {clips.map((media) => {
                const mediaUrl = resolveMediaUrl(media.file_url || media.file);
                return (
                  <div key={media.id} className="mb-4">
                    <PreviewVideo
                      src={mediaUrl}
                      className="max-h-80 w-full rounded"
                      unavailableText="Clip preview unavailable"
                    />
                    <p className="mt-2 truncate text-xs">
                      {media.title ||
                        media.file_name ||
                        media.file_key ||
                        media.file}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <section className={card}>
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">
            Related products
          </h2>
          {product.related_products.length ? (
            product.related_products.map((item) => (
              <Link
                key={item.id}
                href={`/catalog/products/${item.id}`}
                className="mb-2 block text-primary hover:underline"
              >
                {item.name}
              </Link>
            ))
          ) : (
            <p>No related products.</p>
          )}
        </section>
        <section className={`${card} xl:col-span-3`}>
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">
            Audit
          </h2>
          <dl className="grid gap-4 text-sm md:grid-cols-4">
            <Detail label="Created by" value={product.created_by_name || "—"} />
            <Detail
              label="Created"
              value={new Date(product.created_at).toLocaleString()}
            />
            <Detail label="Updated by" value={product.updated_by_name || "—"} />
            <Detail
              label="Updated"
              value={new Date(product.updated_at).toLocaleString()}
            />
          </dl>
        </section>
      </div>
    </>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs">{label}</dt>
      <dd className="mt-1 font-medium text-dark dark:text-white">{value}</dd>
    </div>
  );
}

export function CategoriesPage() {
  const [items, setItems] = useState<ProductCategory[]>([]);
  const load = async () => {
    try {
      setItems(await apiGet<ProductCategory[]>("/catalog/categories/"));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const orderedItems = orderedCategoryTree(items);
  return (
    <>
      <PageHeader
        title="Product Categories"
        description="Organize products into active categories."
        action={{ href: "/catalog/categories/new", label: "Add Category" }}
      />
      <DataTable
        columns={["Category", "Parent", "Status", "Updated", "Actions"]}
        rows={orderedItems}
        empty="No categories found."
        render={({ category: item, depth }) => [
          <div>
            <p className="font-medium" style={{ paddingLeft: `${depth * 20}px` }}>
              {depth ? <span aria-hidden>↳ </span> : null}
              {item.name}
            </p>
            <p className="text-xs" style={{ paddingLeft: `${depth * 20}px` }}>
              {item.slug}
            </p>
          </div>,
          items.find((parentItem) => parentItem.id === item.parent)?.name ||
            "—",
          <StatusBadge value={item.is_active} />,
          new Date(item.updated_at).toLocaleDateString(),
          <div className="flex gap-3 text-sm">
            <Link
              className="text-primary hover:underline"
              href={`/catalog/categories/${item.id}/edit`}
            >
              Edit
            </Link>
            <ConfirmAction
              label="Delete"
              message={`Delete ${item.name}?`}
              className="text-red hover:underline"
              onConfirm={async () => {
                try {
                  await apiDelete(`/catalog/categories/${item.id}/`);
                  toast.success("Category deleted.");
                  void load();
                } catch (error) {
                  toast.error(errorMessage(error));
                }
              }}
            />
          </div>,
        ]}
      />
    </>
  );
}

export function CategoryFormPage({ id }: { id?: string }) {
  const router = useRouter();
  const [items, setItems] = useState<ProductCategory[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parent, setParent] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  useEffect(() => {
    const load = async () => {
      try {
        const categories = await apiGet<ProductCategory[]>(
          "/catalog/categories/",
        );
        setItems(categories);
        if (id) {
          const category = await apiGet<ProductCategory>(
            `/catalog/categories/${id}/`,
          );
          setName(category.name);
          setDescription(category.description);
          setParent(category.parent ? String(category.parent) : "");
          setIsActive(category.is_active);
        }
      } catch (error) {
        toast.error(errorMessage(error));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        description,
        parent: parent ? Number(parent) : null,
        is_active: isActive,
      };
      if (id) await apiPut(`/catalog/categories/${id}/`, payload);
      else await apiPost("/catalog/categories/", payload);
      toast.success(id ? "Category updated." : "Category created.");
      router.push("/catalog/categories");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <p>Loading category…</p>;
  const currentId = id ? Number(id) : null;
  const excludedParentIds = currentId
    ? descendantCategoryIds(items, currentId)
    : new Set<number>();
  if (currentId) excludedParentIds.add(currentId);
  const parentOptions = orderedCategoryTree(items).filter(
    ({ category }) => !excludedParentIds.has(category.id),
  );
  return (
    <>
      <PageHeader
        title={id ? "Edit Category" : "Add Category"}
        description="Create and organize product categories."
        action={{ href: "/catalog/categories", label: "Back" }}
      />
      <form onSubmit={submit} className={card}>
        <div className="grid gap-5 md:grid-cols-2">
          <TextField label="Name" value={name} onChange={setName} required />
          <Field label="Parent category">
            <select
              className={input}
              value={parent}
              onChange={(e) => setParent(e.target.value)}
            >
              <option value="">No parent</option>
              {parentOptions.map(({ category: item, depth }) => (
                  <option key={item.id} value={item.id}>
                    {`${"— ".repeat(depth)}${item.name}`}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Description" className="md:col-span-2">
            <textarea
              className={`${input} min-h-24`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active
          </label>
        </div>
        <button
          disabled={saving}
          className="mt-6 rounded-[5px] bg-primary px-6 py-3 font-medium text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : id ? "Save changes" : "Create Category"}
        </button>
      </form>
    </>
  );
}
