import type { ComponentPropsWithoutRef } from "react";
import { clsx } from "clsx";

export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return <input className={clsx("h-11 w-full rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm text-[var(--color-text)] transition focus:border-[var(--color-text)] focus:outline-none disabled:bg-[var(--color-primary-soft)] disabled:text-[var(--color-text-secondary)]", className)} {...props} />;
}
