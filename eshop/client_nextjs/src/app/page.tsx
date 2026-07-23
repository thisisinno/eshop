import { ProductShelf } from "@/components/products/ProductShelf";
import { serverGet } from "@/lib/api/django";
import type { Category, HomeResponse } from "@/types/storefront";
import Link from "next/link";

export default async function HomePage() {
  const [home, categories] = await Promise.all([
    serverGet<HomeResponse>("/storefront/home/"),
    serverGet<Category[]>("/storefront/categories/"),
  ]);
  return (
    <>
      <div className="sticky top-[58px] z-20 -mx-3 mb-4 bg-[#f8f7ff]/95 px-3 pt-2 backdrop-blur md:top-0">
        <div className="mb-3 grid grid-cols-2 rounded-lg bg-white p-1 text-sm font-bold">
          <Link className="rounded-md bg-[#5b2cff] py-2 text-center text-white" href="/">For You</Link>
          <Link className="rounded-md py-2 text-center" href="/?tab=following">Following</Link>
        </div>
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-3">
          {categories.map((category) => <Link key={category.id} href={`/categories/${category.slug}`} className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">{category.name}</Link>)}
        </div>
      </div>
      {home.shelves.map((shelf) => <ProductShelf key={shelf.key} title={shelf.title} products={shelf.products} />)}
    </>
  );
}
