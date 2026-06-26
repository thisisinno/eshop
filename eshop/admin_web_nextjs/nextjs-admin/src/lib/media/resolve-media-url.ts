const DEFAULT_MEDIA_BASE_URL = "https://eshopmedia.s3.eu-west-1.amazonaws.com";

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function backendOrigin() {
  const apiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || "https://eshop.schoolsoft.online/api";
  return apiUrl.replace(/\/+$/, "").replace(/\/api\/?$/, "");
}

function mediaBaseUrl() {
  return (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || DEFAULT_MEDIA_BASE_URL).replace(/\/+$/, "");
}

export function resolveMediaUrl(value?: string | null): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (raw.startsWith("blob:")) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/media/")) return joinUrl(backendOrigin(), raw);

  const storageKey = raw.replace(/^media\//, "");
  if (/^(products|traders|media)\//.test(raw)) return joinUrl(mediaBaseUrl(), storageKey);
  return joinUrl(mediaBaseUrl(), storageKey);
}
