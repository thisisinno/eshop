import { ProductCard } from "@/components/products/ProductCard";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { serverGet } from "@/lib/api/django";
import { getCurrentUser } from "@/lib/auth/session";
import type { Paginated, ProductCard as ProductCardType } from "@/types/storefront";

export default async function SavedPage() {
  const user = await getCurrentUser();
  if (!user) return <EmptyState title="Sign in to view saved products" action={<ButtonLink href="/auth/sign-in">Sign in</ButtonLink>}>Bookmarks are private to your account.</EmptyState>;
  const data = await serverGet<Paginated<ProductCardType>>("/storefront/bookmarks/");
  return (
    <section>
      <h1 className="mb-4 text-2xl font-black md:text-3xl">Saved</h1>
      {data.results.length ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{data.results.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <EmptyState title="No saved products yet" action={<ButtonLink href="/search">Find products</ButtonLink>}>Tap the heart on products you want to revisit.</EmptyState>}
    </section>
  );
}
