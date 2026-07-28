import type { Metadata } from "next";
import { StoresDirectoryClient } from "@/components/stores/StoresDirectoryClient";
import { serverGet } from "@/lib/api/django";
import type { StoreSummary } from "@/types/storefront";

export const metadata: Metadata = {
  title: "Stores",
  description: "Browse verified fashion stores on SmartWear.",
};

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const rawScope = Array.isArray(params.scope) ? params.scope[0] : params.scope;
  const initialQuery = rawQuery?.trim() || "";
  const initialScope = rawScope === "following" ? "following" : "all";
  const apiParams = new URLSearchParams();
  if (initialQuery) apiParams.set("search", initialQuery);
  const suffix = apiParams.size ? `?${apiParams.toString()}` : "";
  const initialStores = await serverGet<StoreSummary[]>(`/storefront/stores/${suffix}`).catch(() => []);

  return (
    <StoresDirectoryClient
      initialStores={initialStores}
      initialQuery={initialQuery}
      initialScope={initialScope}
    />
  );
}
