import type { User } from "@/types/storefront";
import { BottomNav, Header, LeftNav, RightRail } from "@/components/navigation/Navigation";
import { canPostProduct } from "@/lib/auth/session";
import { serverGet } from "@/lib/api/django";
import { CartProvider } from "@/components/cart/CartProvider";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import type { Cart, StoreSummary, HomeResponse } from "@/types/storefront";

export async function Shell({ children, user }: { children: React.ReactNode; user: User | null }) {
  const [cart, stores, home, unread] = await Promise.all([
    user ? serverGet<Cart>("/storefront/cart/").catch(() => null) : Promise.resolve(null),
    serverGet<StoreSummary[]>("/storefront/stores/").catch(() => []),
    serverGet<HomeResponse>("/storefront/home/").catch(() => ({ shelves: [] })),
    user ? serverGet<{ count: number }>("/storefront/notifications/unread-count/").catch(() => ({ count: 0 })) : Promise.resolve({ count: 0 }),
  ]);
  const recent = home.shelves.find((shelf) => shelf.key === "recently_viewed")?.products ?? [];
  const postable = canPostProduct(user);
  return (
    <NotificationProvider initialUnreadCount={unread.count}>
      <CartProvider initialCart={cart}>
        <Header />
        <LeftNav user={user} canPost={postable} />
        <main className="app-shell">
          <div className="main-column feed-column">{children}</div>
        </main>
        <RightRail cart={cart} stores={stores.slice(0, 4)} recent={recent.slice(0, 3)} />
        <BottomNav user={user} canPost={postable} />
      </CartProvider>
    </NotificationProvider>
  );
}
