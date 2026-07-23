import { canPostProduct, getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ProductComposer } from "@/components/products/ProductComposer";

export default async function PostProductPage() {
  const user = await getCurrentUser();
  if (!canPostProduct(user)) redirect("/");
  return <ProductComposer />;
}
