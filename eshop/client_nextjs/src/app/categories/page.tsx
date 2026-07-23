import { serverGet } from "@/lib/api/django";
import type { Category } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import Image from "next/image";
import Link from "next/link";

export default async function CategoriesPage() {
  const categories = await serverGet<Category[]>("/storefront/categories/");
  return (
    <section>
      <div className="border-b border-[var(--color-border)] px-4 py-4">
        <h1 className="text-2xl font-black md:text-3xl">Categories</h1>
      </div>
      <div className="grid grid-cols-2 gap-3 p-3 md:p-4">
        {categories.map((category) => {
          const image = resolveMediaUrl(category.image_url);
          return (
            <Link key={category.id} href={`/categories/${category.slug}`} className="group overflow-hidden rounded-xl bg-white transition">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--color-primary-soft)]">
                {image ? <Image src={image} alt={category.name} fill sizes="(max-width: 768px) 50vw, 360px" className="object-cover transition group-hover:scale-[1.03]" /> : <div className="grid h-full place-items-center text-3xl font-black text-[var(--color-text)]">{category.name.slice(0, 1)}</div>}
              </div>
              <div className="pt-2">
                <h2 className="font-black">{category.name}</h2>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
