import type { ReactNode } from "react";
import { clsx } from "clsx";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx("inline-flex h-6 items-center rounded-full bg-[var(--color-primary-soft)] px-2 text-xs font-bold text-[var(--color-primary)]", className)}>{children}</span>;
}
