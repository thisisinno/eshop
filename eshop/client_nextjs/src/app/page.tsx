import { ProductShelf } from "@/components/products/ProductShelf";
import { serverGet } from "@/lib/api/django";
import type { Category, HomeResponse } from "@/types/storefront";
import { EmptyState } from "@/components/ui/EmptyState";
import { withAllCategoryFirst } from "@/lib/storefront/categories";
import { HomeDiscoveryControls } from "@/components/home/HomeDiscoveryControls";
import { HomeTabSwipeNavigator } from "@/components/home/HomeTabSwipeNavigator";
import { ExploreStoresLink } from "@/components/home/ExploreStoresLink";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const activeTab = tab === "following" ? "following" : "for-you";
  const [home, categories] = await Promise.all([
    serverGet<HomeResponse>("/storefront/home/").catch(() => ({ shelves: [], following_store_count: 0 })),
    serverGet<Category[]>("/storefront/categories/").catch(() => []),
  ]);
  const storefrontCategories = withAllCategoryFirst(categories);
  const shelves = activeTab === "following" ? home.shelves.filter((shelf) => shelf.key === "following") : home.shelves;
  const hasProducts = shelves.some((shelf) => shelf.products.length);
  return (
    <>
      <HomeDiscoveryControls key={activeTab} categories={storefrontCategories} activeTab={activeTab} />
      <HomeTabSwipeNavigator activeTab={activeTab}>
        {hasProducts ? shelves.map((shelf) => <ProductShelf key={shelf.key} title={shelf.title} products={shelf.products} href={`/collections/${shelf.key}`} />) : activeTab === "following" ? (
          <EmptyState
            title={home.following_store_count === 0 ? "Follow stores to build your feed" : "No products from followed stores yet"}
            action={<ExploreStoresLink>{home.following_store_count === 0 ? "Explore stores" : "Explore more stores"}</ExploreStoresLink>}
          >
            {home.following_store_count === 0
              ? "Explore SmartWear stores and follow the ones you like. Their available products will appear here."
              : "The stores you follow do not have new available products right now."}
          </EmptyState>
        ) : (
          <EmptyState title="No products available">Check categories or search for a product.</EmptyState>
        )}
      </HomeTabSwipeNavigator>
    </>
  );
}
