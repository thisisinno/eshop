import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { clsx } from "clsx";

type ChipProps = ComponentPropsWithoutRef<typeof Link> & { active?: boolean };

export function Chip({ className, active, ...props }: ChipProps) {
  return (
    <Link
      className={clsx(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition active:scale-[0.98] motion-reduce:transition-none",
        active ? "border-[var(--color-black)] bg-[var(--color-black)] text-white" : "border-[var(--color-border-strong)] bg-white text-[var(--color-text)] hover:bg-[var(--color-primary-soft)]",
        className,
      )}
      {...props}
    />
  );
}
