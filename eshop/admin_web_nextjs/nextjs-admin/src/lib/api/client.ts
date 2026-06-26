const TOKEN_KEY = "eshop_admin_token";

const API_URL = (
  process.env.NEXT_PUBLIC_DJANGO_API_URL ||
  "https://eshop.schoolsoft.online/api"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public status: number, public data: unknown, public path?: string) {
    super(formatApiError(data, status, path));
    this.name = "ApiError";
  }
}

/** Turn DRF's field errors into text that can be shown directly in a toast. */
export function formatApiError(data: unknown, status?: number, path?: string): string {
  const prefix = status ? `Backend error ${status}${path ? ` on ${path}` : ""}.` : "";
  if (typeof data === "string" && data.trim()) {
    const text = data.trim();
    if (/^<!doctype html>/i.test(text) || /<html[\s>]/i.test(text)) {
      return `${prefix || "Backend returned HTML error page."} Check Django logs.`;
    }
    return prefix ? `${prefix} ${text}` : text;
  }
  if (!data || typeof data !== "object") return prefix || "The request failed.";

  const entries = Object.entries(data as Record<string, unknown>);
  const messages = entries.flatMap(([field, value]) => {
    const text = Array.isArray(value) ? value.join(" ") : typeof value === "string" ? value : "";
    if (!text) return [];
    return field === "detail" || field === "non_field_errors" ? [text] : [`${field.replaceAll("_", " ")}: ${text}`];
  });
  const message = messages.join(" ") || "The request failed.";
  return prefix ? `${prefix} ${message}` : message;
}

function getBrowserToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const body = init.body;
  const headers = new Headers(init.headers);
  const token = getBrowserToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Token ${token}`);
  }

  if (body && !(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(
    `${API_URL}${path.startsWith("/") ? path : `/${path}`}`,
    { ...init, headers },
  );

  const contentType = response.headers.get("content-type") || "";
  const data: unknown = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) throw new ApiError(response.status, data, path.startsWith("/") ? path : `/${path}`);
  return data as T;
}

function jsonBody(body: unknown) {
  return body instanceof FormData ? body : JSON.stringify(body);
}

export const apiGet = <T>(path: string) => request<T>(path);
export const apiPost = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: jsonBody(body) });
export const apiPut = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "PUT", body: jsonBody(body) });
export const apiPatch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "PATCH", body: jsonBody(body) });
export const apiDelete = <T>(path: string) => request<T>(path, { method: "DELETE" });
