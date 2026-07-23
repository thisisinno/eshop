import { forwardDjango } from "@/lib/api/route-utils";

export async function POST(request: Request) {
  return forwardDjango("/catalog/products/", { method: "POST", body: await request.text() });
}
