import { forwardDjango } from "@/lib/api/route-utils";

export async function GET() {
  return forwardDjango<{ count: number }>("/storefront/notifications/unread-count/");
}
