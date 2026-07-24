import { ProductShelf } from "@/components/products/ProductShelf";
import { serverGet } from "@/lib/api/django";
import type { Category, HomeResponse } from "@/types/storefront";
import Link from "next/link";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { withAllCategoryFirst } from "@/lib/storefront/categories";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const activeTab = tab === "following" ? "following" : "for-you";
  const [home, categories] = await Promise.all([
    serverGet<HomeResponse>("/storefront/home/").catch(() => ({ shelves: [] })),
    serverGet<Category[]>("/storefront/categories/").catch(() => []),
  ]);
  const storefrontCategories = withAllCategoryFirst(categories);
  const shelves = activeTab === "following" ? home.shelves.filter((shelf) => shelf.key === "following") : home.shelves;
  const hasProducts = shelves.some((shelf) => shelf.products.length);
  return (
    <>
      <div className="sticky top-[58px] z-20 bg-white/95 backdrop-blur md:top-0">
        <div className="grid grid-cols-2 border-b border-[var(--color-border)] text-sm font-bold">
          <Link className={`relative py-4 text-center transition hover:bg-[var(--color-primary-soft)] ${activeTab === "for-you" ? "text-[var(--color-text)]" : "text-[var(--color-text-secondary)]"}`} href="/">{activeTab === "for-you" ? <span className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-[var(--color-black)]" /> : null}For You</Link>
          <Link className={`relative py-4 text-center transition hover:bg-[var(--color-primary-soft)] ${activeTab === "following" ? "text-[var(--color-text)]" : "text-[var(--color-text-secondary)]"}`} href="/?tab=following">{activeTab === "following" ? <span className="absolute bottom-0 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-[var(--color-black)]" /> : null}Following</Link>
        </div>
        <div className="flex gap-2 overflow-x-auto px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-4">
          {storefrontCategories.map((category) => <Chip key={category.id} href={`/categories/${category.slug}`}>{category.name}</Chip>)}
        </div>
      </div>
      {hasProducts ? shelves.map((shelf) => <ProductShelf key={shelf.key} title={shelf.title} products={shelf.products} href={`/collections/${shelf.key}`} />) : (
        <EmptyState title={activeTab === "following" ? "Follow stores to build your feed" : "No products available"} action={<ButtonLink href="/categories" variant="outline">Browse categories</ButtonLink>}>
          {activeTab === "following" ? "Stores you follow will appear here with new products and recommendations." : "Check categories or search for a product."}
        </EmptyState>
      )}
    </>
  );
}
