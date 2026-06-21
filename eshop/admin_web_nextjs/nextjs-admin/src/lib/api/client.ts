const TOKEN_KEY = "eshop_admin_token";

const API_URL = (
  process.env.NEXT_PUBLIC_DJANGO_API_URL ||
  "https://eshop.schoolsoft.online/api"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public status: number, public data: unknown) {
    super(
      typeof data === "object" && data && "detail" in data
        ? String(data.detail)
        : "The request failed.",
    );
    this.name = "ApiError";
  }
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

  if (!response.ok) throw new ApiError(response.status, data);
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
