import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-black tracking-normal md:text-xl">{title}</h2>
      {href ? <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]">View all <ChevronRight aria-hidden className="h-4 w-4" /></Link> : null}
    </div>
  );
}
