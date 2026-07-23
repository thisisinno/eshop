import "server-only";

import { cookies } from "next/headers";

const API_URL = (process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_DJANGO_API_URL || "https://eshop.schoolsoft.online/api").replace(/\/$/, "");
export const TOKEN_COOKIE = "eshop_customer_token";
export const ANON_COOKIE = "eshop_anon_session";

export class DjangoApiError extends Error {
  constructor(public status: number, public data: unknown) {
    super(typeof data === "object" && data && "detail" in data ? String((data as { detail: unknown }).detail) : `Django API error ${status}`);
  }
}

export async function getServerToken() {
  return (await cookies()).get(TOKEN_COOKIE)?.value ?? null;
}

export async function getAnonymousSession() {
  return (await cookies()).get(ANON_COOKIE)?.value ?? null;
}

export async function djangoFetch<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(init.headers);
  const body = init.body;
  const resolvedToken = token === undefined ? await getServerToken() : token;
  if (resolvedToken) headers.set("Authorization", `Token ${resolvedToken}`);
  if (body && !(body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const anonymousSession = await getAnonymousSession();
  if (anonymousSession) headers.set("X-Anonymous-Session", anonymousSession);
  const response = await fetch(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers,
    cache: init.cache ?? "no-store",
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) throw new DjangoApiError(response.status, data);
  return data as T;
}

export const serverGet = <T>(path: string, init?: RequestInit) => djangoFetch<T>(path, { ...init, method: "GET" });
