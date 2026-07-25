import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-black tracking-normal md:text-xl">{title}</h2>
      {href ? <Link href={href} aria-label={`View all ${title}`} title={`View all ${title}`} className="section-more-action group grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-primary-soft)]"><ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></Link> : null}
    </div>
  );
}
