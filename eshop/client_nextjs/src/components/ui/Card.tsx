import type { ComponentPropsWithoutRef } from "react";
import { clsx } from "clsx";

export function Card({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={clsx("rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)]", className)} {...props} />;
}
