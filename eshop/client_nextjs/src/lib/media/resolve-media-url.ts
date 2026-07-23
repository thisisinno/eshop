export function resolveMediaUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith("blob:")) return url;
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "";
  return `${base.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
}
