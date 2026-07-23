import { serverGet } from "@/lib/api/django";
import type { User } from "@/types/storefront";

export async function getCurrentUser() {
  try {
    return await serverGet<User>("/auth/me/");
  } catch {
    return null;
  }
}

export function canPostProduct(user: User | null) {
  return Boolean(user?.is_staff && (user.is_superuser || user.permissions?.includes("api.add_product")));
}
