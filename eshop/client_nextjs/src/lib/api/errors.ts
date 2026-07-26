function cleanMessage(value: string) {
  const text = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!text || /<(?:!doctype|html|head|body)\b/i.test(value) || /traceback|stack trace/i.test(text)) return "";
  return text;
}

function collect(data: unknown, depth = 0): string[] {
  if (depth > 6) return [];
  if (typeof data === "string") {
    const text = cleanMessage(data);
    return text ? [text] : [];
  }
  if (Array.isArray(data)) return data.flatMap((value) => collect(value, depth + 1));
  if (!data || typeof data !== "object") return [];
  return Object.values(data as Record<string, unknown>).flatMap((value) => collect(value, depth + 1));
}

export function extractDrfErrorMessage(data: unknown, fallback = "") {
  return Array.from(new Set(collect(data))).slice(0, 2).join(" ") || fallback;
}

export async function parseApiError(response: Response, fallback = "Request failed.") {
  const contentType = response.headers.get("content-type") || "";
  let data: unknown;
  try {
    data = contentType.includes("application/json") ? await response.json() : await response.text();
  } catch {
    return fallback;
  }
  return extractDrfErrorMessage(data, fallback);
}
