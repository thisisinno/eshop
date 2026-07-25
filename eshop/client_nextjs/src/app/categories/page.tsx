import { serverGet } from "@/lib/api/django";
import type { Category } from "@/types/storefront";
import { withAllCategoryFirst } from "@/lib/storefront/categories";
import { CategoryDirectory } from "@/components/categories/CategoryDirectory";

export default async function CategoriesPage() {
  const categories = withAllCategoryFirst(await serverGet<Category[]>("/storefront/categories/"));
  return (
    <section>
      <div className="border-b border-[var(--color-border)] px-4 py-4">
        <h1 className="text-2xl font-black md:text-3xl">Categories</h1>
      </div>
      <CategoryDirectory categories={categories} />
    </section>
  );
}
