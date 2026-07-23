import type { ComponentPropsWithoutRef } from "react";
import { clsx } from "clsx";

type IconButtonProps = ComponentPropsWithoutRef<"button"> & {
  active?: boolean;
};

export function IconButton({ className, active, ...props }: IconButtonProps) {
  return (
    <button
      className={clsx(
        "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text)] shadow-sm transition duration-180 hover:-translate-y-0.5 hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        active && "border-blue-200 bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
        className,
      )}
      {...props}
    />
  );
}
