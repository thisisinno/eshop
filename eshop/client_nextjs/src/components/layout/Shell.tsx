import type { User } from "@/types/storefront";
import { BottomNav, Header, LeftNav, RightRail } from "@/components/navigation/Navigation";
import { canPostProduct } from "@/lib/auth/session";
import { serverGet } from "@/lib/api/django";
import { CartProvider } from "@/components/cart/CartProvider";
import type { Cart, StoreSummary, HomeResponse } from "@/types/storefront";

export async function Shell({ children, user }: { children: React.ReactNode; user: User | null }) {
  const [cart, stores, home] = await Promise.all([
    user ? serverGet<Cart>("/storefront/cart/").catch(() => null) : Promise.resolve(null),
    serverGet<StoreSummary[]>("/storefront/stores/").catch(() => []),
    serverGet<HomeResponse>("/storefront/home/").catch(() => ({ shelves: [] })),
  ]);
  const recent = home.shelves.find((shelf) => shelf.key === "recently_viewed")?.products ?? [];
  const postable = canPostProduct(user);
  return (
    <CartProvider initialCount={cart?.total_quantity ?? 0}>
      <Header />
      <LeftNav user={user} canPost={postable} />
      <main className="app-shell">
        <div className="main-column feed-column">{children}</div>
      </main>
      <RightRail cart={cart} stores={stores.slice(0, 4)} recent={recent.slice(0, 3)} />
      <BottomNav user={user} canPost={postable} />
    </CartProvider>
  );
}
