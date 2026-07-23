import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/products/Gallery";
import { ProductShelf } from "@/components/products/ProductShelf";
import { serverGet } from "@/lib/api/django";
import type { ProductDetail } from "@/types/storefront";

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
      <Gallery gallery={product.media.gallery} videos={product.media.videos} viewer={product.viewer_360} />
      <section className="mt-4 rounded-lg bg-white p-4">
        <p className="font-bold text-[#5b2cff]">{product.store.business_name}{product.store.is_verified ? " · Verified" : ""}</p>
        <h1 className="mt-2 text-2xl font-black">{product.name}</h1>
        <p className="mt-2 text-2xl font-black">{product.currency} {Number(product.price).toLocaleString()}</p>
        {product.compare_at_price && <p className="text-black/45 line-through">{product.currency} {Number(product.compare_at_price).toLocaleString()}</p>}
        <p className="mt-3 text-sm">{product.short_description}</p>
        <div className="mt-4 flex gap-2"><button className="flex-1 rounded-lg bg-[#5b2cff] py-3 font-bold text-white">Add to cart</button><button className="flex-1 rounded-lg bg-[#161225] py-3 font-bold text-white">Buy now</button></div>
      </section>
      <section className="mt-4 rounded-lg bg-white p-4"><h2 className="font-black">Description</h2><p className="mt-2 whitespace-pre-wrap text-sm text-black/70">{product.description || "No description provided."}</p></section>
      <ProductShelf title="Related products" products={product.related_products} />
    </article>
  );
}
