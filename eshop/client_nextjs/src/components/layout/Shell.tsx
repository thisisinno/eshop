import type { User } from "@/types/storefront";
import { BottomNav, Header, LeftNav, RightRail } from "@/components/navigation/Navigation";
import { canPostProduct } from "@/lib/auth/session";

export function Shell({ children, user }: { children: React.ReactNode; user: User | null }) {
  return (
    <>
      <Header user={user} />
      <LeftNav user={user} canPost={canPostProduct(user)} />
      <main className="app-shell">
        <div className="main-column">{children}</div>
      </main>
      <RightRail />
      <BottomNav canPost={canPostProduct(user)} />
    </>
  );
}
