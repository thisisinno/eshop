import type { ComponentPropsWithoutRef } from "react";

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function ListTile({ className, ...props }: ComponentPropsWithoutRef<"article">) {
  return (
    <article
      className={classes(
        "group min-h-20 bg-white transition-[background-color,opacity] duration-180 hover:bg-[var(--color-primary-soft)] motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

export const listTileMainClass =
  "min-w-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

export const listTileActionClass =
  "inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[var(--color-border-strong)] px-2 text-xs font-bold transition duration-180 hover:bg-white active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black motion-reduce:transition-none motion-reduce:active:scale-100";
