import type { ReactNode } from "react";
import { clsx } from "clsx";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx("inline-flex h-6 items-center rounded-full border border-[var(--color-border-strong)] bg-white px-2 text-xs font-bold text-[var(--color-text)]", className)}>{children}</span>;
}
