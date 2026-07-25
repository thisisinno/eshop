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
  parent_id: null,
};

export function withAllCategoryFirst(categories: Category[]) {
  return [ALL_CATEGORY, ...categories.filter((category) => category.slug !== ALL_CATEGORY.slug)];
}

export function rootCategories(categories: Category[]) {
  return withAllCategoryFirst(categories).filter(
    (category) => category.slug === ALL_CATEGORY.slug || category.parent_id === null,
  );
}

export function categoryChildren(categories: Category[], parentId: number) {
  return categories
    .filter((category) => category.parent_id === parentId && category.slug !== ALL_CATEGORY.slug)
    .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name));
}

export function hasCategoryChildren(categories: Category[], categoryId: number) {
  return categories.some((category) => category.parent_id === categoryId);
}

export function categoryDescendantIds(categories: Category[], categoryId: number) {
  const descendants = new Set<number>();
  const pending = [categoryId];
  while (pending.length) {
    const current = pending.pop();
    if (current === undefined) continue;
    for (const child of categoryChildren(categories, current)) {
      if (descendants.has(child.id)) continue;
      descendants.add(child.id);
      pending.push(child.id);
    }
  }
  return descendants;
}

export function categoryDepth(categories: Category[], category: Category) {
  const byId = new Map(categories.map((item) => [item.id, item]));
  const visited = new Set<number>();
  let depth = 0;
  let current = category;
  while (current.parent_id !== null && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = byId.get(current.parent_id);
    if (!parent) break;
    depth += 1;
    current = parent;
  }
  return depth;
}
