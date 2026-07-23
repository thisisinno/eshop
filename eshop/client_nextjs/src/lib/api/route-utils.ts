import "server-only";

import { DjangoApiError, djangoFetch, getServerToken } from "./django";

const ALLOWED_PREFIXES = [
  "/storefront/products/",
  "/storefront/bookmarks/",
  "/storefront/cart/",
  "/storefront/cart/items/",
  "/storefront/orders/",
  "/storefront/notifications/",
  "/storefront/stores/",
  "/catalog/products/",
] as const;

export function assertAllowedDjangoPath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized.includes("://") || normalized.includes("..")) {
    throw new DjangoApiError(400, { detail: "Invalid backend path." });
  }
  if (!ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    throw new DjangoApiError(400, { detail: "Backend path is not allowed." });
  }
  return normalized;
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof DjangoApiError) {
    return Response.json({ error: error.message, detail: error.data }, { status: error.status });
  }
  return Response.json({ error: "Network request failed." }, { status: 502 });
}

export async function requireToken() {
  const token = await getServerToken();
  if (!token) return null;
  return token;
}

export async function forwardDjango<T>(path: string, init: RequestInit = {}, options: { auth?: "required" | "optional" } = { auth: "required" }) {
  const safePath = assertAllowedDjangoPath(path);
  const token = await requireToken();
  if (options.auth !== "optional" && !token) return Response.json({ error: "Sign in required." }, { status: 401 });
  try {
    const data = await djangoFetch<T>(safePath, init, token);
    const status = init.method && init.method !== "GET" ? 201 : 200;
    return Response.json(data, { status });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
