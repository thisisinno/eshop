import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: { href: string; label: string } | ReactNode }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold text-dark dark:text-white">{title}</h1>{description && <p className="mt-1 text-sm">{description}</p>}</div>{typeof action === "object" && action && "href" in action ? <Link href={action.href} className="rounded-[5px] bg-primary px-5 py-3 font-medium text-white hover:bg-opacity-90">{action.label}</Link> : action}</div>;
}
