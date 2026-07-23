import type { ComponentPropsWithoutRef } from "react";
import { clsx } from "clsx";

type IconButtonProps = ComponentPropsWithoutRef<"button"> & {
  active?: boolean;
};

export function IconButton({ className, active, ...props }: IconButtonProps) {
  return (
    <button
      className={clsx(
        "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--color-border-strong)] bg-white text-[var(--color-text)] transition duration-180 hover:bg-[var(--color-primary-soft)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none",
        active && "border-[var(--color-text)] bg-[var(--color-primary-soft)] text-[var(--color-text)]",
        className,
      )}
      {...props}
    />
  );
}
