import type { User } from "@/types/storefront";
import { BottomNav, Header, LeftNav, RightRail } from "@/components/navigation/Navigation";
import { canPostProduct } from "@/lib/auth/session";
import { serverGet } from "@/lib/api/django";
import { CartProvider } from "@/components/cart/CartProvider";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import type { Cart, StoreSummary, HomeResponse, SiteBranding } from "@/types/storefront";

export async function Shell({ children, user }: { children: React.ReactNode; user: User | null }) {
  const [cart, stores, home, unread, branding] = await Promise.all([
    user ? serverGet<Cart>("/storefront/cart/").catch(() => null) : Promise.resolve(null),
    serverGet<StoreSummary[]>("/storefront/stores/").catch(() => []),
    serverGet<HomeResponse>("/storefront/home/").catch(() => ({ shelves: [] })),
    user ? serverGet<{ count: number }>("/storefront/notifications/unread-count/").catch(() => ({ count: 0 })) : Promise.resolve({ count: 0 }),
    serverGet<SiteBranding>("/storefront/branding/").catch(() => ({ site_name: "eShop", logo_url: null, logo_alt_text: "", statuses: [], updated_at: "" })),
  ]);
  const recent = home.shelves.find((shelf) => shelf.key === "recently_viewed")?.products ?? [];
  const postable = canPostProduct(user);
  return (
    <NotificationProvider initialUnreadCount={unread.count}>
      <CartProvider initialCart={cart}>
        <Header branding={branding} user={user} />
        <LeftNav user={user} canPost={postable} branding={branding} />
        <main className="app-shell">
          <div className="main-column feed-column">{children}</div>
        </main>
        <RightRail cart={cart} stores={stores.slice(0, 4)} recent={recent.slice(0, 3)} />
        <BottomNav user={user} canPost={postable} />
      </CartProvider>
    </NotificationProvider>
  );
}
