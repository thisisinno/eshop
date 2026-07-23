import { serverGet } from "@/lib/api/django";
import type { Category } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import Image from "next/image";
import Link from "next/link";

export default async function CategoriesPage() {
  const categories = await serverGet<Category[]>("/storefront/categories/");
  return (
    <section>
      <h1 className="mb-4 text-2xl font-black md:text-3xl">Categories</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => {
          const image = resolveMediaUrl(category.image_url);
          return (
            <Link key={category.id} href={`/categories/${category.slug}`} className="group overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]">
              <div className="relative aspect-[4/3] bg-slate-100">
                {image ? <Image src={image} alt={category.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition group-hover:scale-[1.03]" /> : <div className="grid h-full place-items-center text-3xl text-[var(--color-primary)]">{category.icon || category.name.slice(0, 1)}</div>}
              </div>
              <div className="p-3">
                <h2 className="font-black">{category.name}</h2>
                <p className="line-clamp-2 mt-1 text-sm text-[var(--color-text-secondary)]">{category.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
