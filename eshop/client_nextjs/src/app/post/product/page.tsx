import { canPostProduct, getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function PostProductPage() {
  const user = await getCurrentUser();
  if (!canPostProduct(user)) redirect("/");
  return <section className="rounded-lg bg-white p-6"><h1 className="text-2xl font-black">Post product</h1><div className="mt-5 grid gap-4"><Step title="1. Store and category" /><Step title="2. Product information" /><Step title="3. Gallery/slides" /><Step title="4. 360/3D" /><Step title="5. Preview and publish" /></div><p className="mt-5 text-sm text-black/60">This composer uses the existing Django product endpoints and requires real 360 frames or a GLB model before active publishing.</p></section>;
}

function Step({ title }: { title: string }) {
  return <div className="rounded-lg border border-black/10 p-4"><h2 className="font-black">{title}</h2><input className="mt-3 w-full rounded border p-3" placeholder="Composer control" /></div>;
}
