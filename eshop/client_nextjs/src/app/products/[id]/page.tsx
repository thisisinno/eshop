import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/products/Gallery";
import { ProductShelf } from "@/components/products/ProductShelf";
import { serverGet } from "@/lib/api/django";
import type { ProductDetail } from "@/types/storefront";
import { ProductPurchasePanel } from "@/components/products/ProductPurchasePanel";
import { CollapsibleSections } from "@/components/products/CollapsibleSections";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const product = await serverGet<ProductDetail>(`/storefront/products/${id}/`);
    return { title: product.name, description: product.short_description, alternates: { canonical: `/products/${id}` }, openGraph: { title: product.name, description: product.short_description, images: product.primary_media_url ? [product.primary_media_url] : [] } };
  } catch {
    return { title: "Product not found" };
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let product: ProductDetail;
  try { product = await serverGet<ProductDetail>(`/storefront/products/${id}/`); } catch { notFound(); }
  const jsonLd = { "@context": "https://schema.org", "@type": "Product", name: product.name, image: product.primary_media_url ? [product.primary_media_url] : [], offers: { "@type": "Offer", price: product.price, priceCurrency: product.currency, availability: product.stock_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } };
  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,.95fr)] lg:items-start">
        <Gallery gallery={product.media.gallery} videos={product.media.videos} viewer={product.viewer_360} />
        <ProductPurchasePanel product={product} />
      </div>
      <CollapsibleSections product={product} />
      <div>
        <ProductShelf title="Related products" products={product.related_products} href={`/search?category=${product.category?.slug ?? ""}`} />
      </div>
    </article>
  );
}
