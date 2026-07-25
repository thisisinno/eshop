import { ProductShelf } from "@/components/products/ProductShelf";
import { serverGet } from "@/lib/api/django";
import type { Category, HomeResponse } from "@/types/storefront";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { withAllCategoryFirst } from "@/lib/storefront/categories";
import { HomeDiscoveryControls } from "@/components/home/HomeDiscoveryControls";

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
      <HomeDiscoveryControls key={activeTab} categories={storefrontCategories} activeTab={activeTab} />
      {hasProducts ? shelves.map((shelf) => <ProductShelf key={shelf.key} title={shelf.title} products={shelf.products} href={`/collections/${shelf.key}`} />) : (
        <EmptyState title={activeTab === "following" ? "Follow stores to build your feed" : "No products available"} action={<ButtonLink href="/categories" variant="outline">Browse categories</ButtonLink>}>
          {activeTab === "following" ? "Stores you follow will appear here with new products and recommendations." : "Check categories or search for a product."}
        </EmptyState>
      )}
    </>
  );
}
