import type { ComponentPropsWithoutRef } from "react";
import { clsx } from "clsx";

export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return <input className={clsx("h-11 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-text)] transition focus:border-[var(--color-primary)] focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400", className)} {...props} />;
}
