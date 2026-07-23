import { ProductCard } from "@/components/products/ProductCard";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { DjangoApiError, serverGet } from "@/lib/api/django";
import { getCurrentUser } from "@/lib/auth/session";
import type { Paginated, ProductCard as ProductCardType } from "@/types/storefront";

export default async function SavedPage() {
  const user = await getCurrentUser();
  if (!user) return <EmptyState title="Sign in to view My List" action={<ButtonLink href="/auth/sign-in">Sign in</ButtonLink>}>Products in My List are private to your account.</EmptyState>;
  let data: Paginated<ProductCardType> | null = null;
  let error: DjangoApiError | null = null;
  try {
    data = await serverGet<Paginated<ProductCardType>>("/storefront/bookmarks/");
  } catch (caught) {
    if (caught instanceof DjangoApiError) {
      error = caught;
      console.error("Storefront bookmarks endpoint is unavailable on configured backend.", { status: caught.status, data: caught.data });
    } else {
      throw caught;
    }
  }
  if (error?.status === 401 || error?.status === 403) return <EmptyState title="Sign in to view My List" action={<ButtonLink href="/auth/sign-in">Sign in</ButtonLink>}>Products in My List are private to your account.</EmptyState>;
  if (error?.status === 404) return <EmptyState title="My List service is unavailable" action={<ButtonLink href="/search" variant="outline">Browse products</ButtonLink>}>The configured backend does not expose the storefront bookmarks endpoint yet.</EmptyState>;
  if (error) return <EmptyState title="My List could not load" action={<ButtonLink href="/saved" variant="outline">Retry</ButtonLink>}>This looks like a temporary backend or network problem.</EmptyState>;
  return (
    <section>
      <div className="border-b border-[var(--color-border)] px-4 py-4">
        <h1 className="text-2xl font-black md:text-3xl">My List</h1>
      </div>
      {data?.results.length ? <div className="product-grid-two p-3 md:p-4">{data.results.map((product) => <ProductCard key={product.id} product={product} variant="my-list" />)}</div> : <div className="p-4"><EmptyState title="No products in My List yet" action={<ButtonLink href="/search">Find products</ButtonLink>}>Use + on products you want to revisit.</EmptyState></div>}
    </section>
  );
}
