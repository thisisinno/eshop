import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary: "bg-[var(--color-primary)] text-white shadow-sm hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]",
  secondary: "bg-[var(--color-black)] text-white shadow-sm hover:bg-black/85",
  outline: "border border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-slate-300 hover:bg-slate-50",
  ghost: "bg-transparent text-[var(--color-text)] hover:bg-slate-100",
  danger: "bg-[var(--color-danger)] text-white hover:bg-red-700",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
  icon: "h-11 w-11 p-0",
};

const base = "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold transition duration-180 ease-out hover:-translate-y-0.5 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export function Button({ className, variant = "primary", size = "md", loading, children, disabled, ...props }: ButtonProps) {
  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function ButtonLink({ className, variant = "primary", size = "md", children, ...props }: ButtonLinkProps) {
  return <Link className={clsx(base, variants[variant], sizes[size], className)} {...props}>{children}</Link>;
}
