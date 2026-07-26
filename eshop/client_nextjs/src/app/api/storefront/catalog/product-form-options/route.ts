import { forwardDjango } from "@/lib/api/route-utils";

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams.get("search") || "";
  return forwardDjango(`/catalog/product-form-options/?search=${encodeURIComponent(search)}`);
}
