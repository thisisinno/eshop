import { clsx } from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-lg bg-gradient-to-r from-slate-100 via-white to-slate-100 bg-[length:200%_100%]", className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="h-[312px] rounded-lg border border-[var(--color-border)] bg-white p-2">
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="mt-3 h-3 w-20" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-1 h-4 w-4/5" />
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </div>
  );
}
