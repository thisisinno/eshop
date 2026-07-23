import { ProductShelf } from "@/components/products/ProductShelf";
import { serverGet } from "@/lib/api/django";
import type { Category, HomeResponse } from "@/types/storefront";
import Link from "next/link";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const activeTab = tab === "following" ? "following" : "for-you";
  const [home, categories] = await Promise.all([
    serverGet<HomeResponse>("/storefront/home/").catch(() => ({ shelves: [] })),
    serverGet<Category[]>("/storefront/categories/").catch(() => []),
  ]);
  const shelves = activeTab === "following" ? home.shelves.filter((shelf) => shelf.key === "following") : home.shelves;
  const hasProducts = shelves.some((shelf) => shelf.products.length);
  return (
    <>
      <div className="sticky top-[58px] z-20 -mx-3 mb-4 bg-[var(--color-background)]/95 px-3 pt-2 backdrop-blur md:top-0">
        <div className="mb-3 grid grid-cols-2 rounded-lg border border-[var(--color-border)] bg-white p-1 text-sm font-bold shadow-sm">
          <Link className={`rounded-md py-2 text-center transition ${activeTab === "for-you" ? "bg-[var(--color-primary)] text-white" : "hover:bg-slate-100"}`} href="/">For You</Link>
          <Link className={`rounded-md py-2 text-center transition ${activeTab === "following" ? "bg-[var(--color-primary)] text-white" : "hover:bg-slate-100"}`} href="/?tab=following">Following</Link>
        </div>
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((category) => <Chip key={category.id} href={`/categories/${category.slug}`}>{category.icon ? <span aria-hidden>{category.icon}</span> : null}{category.name}</Chip>)}
        </div>
      </div>
      {hasProducts ? shelves.map((shelf) => <ProductShelf key={shelf.key} title={shelf.title} products={shelf.products} href={`/search?sort=${shelf.key === "best_sellers" ? "best_selling" : "newest"}`} />) : (
        <EmptyState title={activeTab === "following" ? "Follow stores to build your feed" : "No products available"} action={<ButtonLink href="/categories" variant="outline">Browse categories</ButtonLink>}>
          {activeTab === "following" ? "Stores you follow will appear here with new products and recommendations." : "Check categories or search for a product."}
        </EmptyState>
      )}
    </>
  );
}
