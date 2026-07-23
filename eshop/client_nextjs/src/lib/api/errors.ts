const SAFE_FIELDS = new Set(["detail", "quantity", "product", "cart", "non_field_errors", "error"]);

function cleanMessage(value: string) {
  const text = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!text || /^<!doctype html/i.test(text) || /server error|traceback/i.test(text)) return "";
  return text;
}

function collect(data: unknown): string[] {
  if (typeof data === "string") {
    const text = cleanMessage(data);
    return text ? [text] : [];
  }
  if (Array.isArray(data)) return data.flatMap(collect);
  if (!data || typeof data !== "object") return [];
  return Object.entries(data as Record<string, unknown>).flatMap(([field, value]) => {
    if (field === "detail" && value && typeof value === "object") return collect(value);
    if (!SAFE_FIELDS.has(field)) return [];
    return collect(value);
  });
}

export async function parseApiError(response: Response, fallback = "Request failed.") {
  const contentType = response.headers.get("content-type") || "";
  let data: unknown;
  try {
    data = contentType.includes("application/json") ? await response.json() : await response.text();
  } catch {
    return fallback;
  }
  return Array.from(new Set(collect(data))).slice(0, 2).join(" ") || fallback;
}
