import type { Category } from "@/types/storefront";

export const ALL_CATEGORY: Category = {
  id: 0,
  name: "All",
  slug: "all",
  description: "All products",
  icon: "Grid2X2",
  image_url: null,
  display_order: 0,
  is_featured: true,
};

export function withAllCategoryFirst(categories: Category[]) {
  return [ALL_CATEGORY, ...categories.filter((category) => category.slug !== ALL_CATEGORY.slug)];
}
