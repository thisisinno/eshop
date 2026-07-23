import { serverGet } from "@/lib/api/django";
import type { Category } from "@/types/storefront";
import Link from "next/link";

export default async function CategoriesPage() {
  const categories = await serverGet<Category[]>("/storefront/categories/");
  return <section><h1 className="mb-4 text-2xl font-black">Categories</h1><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{categories.map((category) => <Link key={category.id} href={`/categories/${category.slug}`} className="rounded-lg bg-white p-4 shadow-sm"><p className="text-2xl">{category.icon || "▦"}</p><h2 className="mt-3 font-black">{category.name}</h2><p className="line-clamp-2 mt-1 text-sm text-black/55">{category.description}</p></Link>)}</div></section>;
}
