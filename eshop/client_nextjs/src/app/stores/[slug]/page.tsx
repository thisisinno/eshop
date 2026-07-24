import { ProductCard } from "@/components/products/ProductCard";
import { serverGet } from "@/lib/api/django";
import type { Paginated, ProductCard as ProductCardType, StoreDetail } from "@/types/storefront";
import { notFound } from "next/navigation";
import Image from "next/image";
import { MapPin, Search, Store } from "lucide-react";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import { FollowButton } from "@/components/stores/FollowButton";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { VerifiedBusinessBadge } from "@/components/store/VerifiedBusinessBadge";

export default async function StorePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.search) qs.set("search", sp.search);
  if (sp.category) qs.set("category", sp.category);
  if (sp.sort) qs.set("sort", sp.sort);
  let data: Paginated<ProductCardType> & { store: StoreDetail };
  try { data = await serverGet<Paginated<ProductCardType> & { store: StoreDetail }>(`/storefront/stores/${slug}/?${qs.toString()}`); } catch { notFound(); }
  const cover = resolveMediaUrl(data.store.cover_url);
  const logo = resolveMediaUrl(data.store.logo_url);
  return (
    <section>
      <div className="overflow-hidden border-b border-[var(--color-border)] bg-white">
        <div className="relative h-32 bg-[var(--color-primary-soft)] md:h-44">
          {cover ? <Image src={cover} alt={`${data.store.business_name} cover`} fill sizes="(max-width: 1024px) 100vw, 760px" className="object-cover" /> : null}
        </div>
        <div className="px-4 pb-4">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-3">
              <div className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-xl border-4 border-white bg-[var(--color-primary-soft)]">
                {logo ? <Image src={logo} alt={`${data.store.business_name} logo`} fill sizes="80px" className="object-cover" /> : <Store aria-hidden className="h-8 w-8 text-[var(--color-text)]" />}
              </div>
              <div className="pb-1">
                <h1 className="flex items-center gap-2 text-2xl font-black md:text-3xl">{data.store.business_name}{data.store.is_verified ? <VerifiedBusinessBadge className="h-5 w-5" /> : null}</h1>
                <p className="mt-1 inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)]"><MapPin aria-hidden className="h-4 w-4" />{data.store.location_summary || "Location not listed"}</p>
              </div>
            </div>
            <FollowButton slug={data.store.slug} initialFollowing={data.store.is_following} />
          </div>
          <p className="mt-4 text-sm text-[var(--color-text-secondary)]">{data.store.follower_count} followers · {data.store.product_count} products</p>
          {data.store.address_description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">{data.store.address_description}</p> : null}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {data.store.categories.map((category) => <Chip key={category.id} href={`/stores/${slug}?category=${category.slug}`} active={sp.category === category.slug}>{category.name}</Chip>)}
          </div>
          <form className="mt-4 flex gap-2">
            <label className="relative flex-1">
              <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
              <input name="search" defaultValue={sp.search || ""} placeholder="Search this store" className="h-11 w-full rounded-full border border-[var(--color-border-strong)] bg-white pl-10 pr-3 text-sm focus:border-[var(--color-text)] focus:outline-none" />
            </label>
            <button className="h-11 rounded-full bg-[var(--color-black)] px-4 text-sm font-semibold text-white">Search</button>
          </form>
        </div>
      </div>
      {data.results.length ? <div className="product-grid-two p-3 md:p-4">{data.results.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="p-4"><EmptyState title="No products found in this store" /></div>}
    </section>
  );
}
