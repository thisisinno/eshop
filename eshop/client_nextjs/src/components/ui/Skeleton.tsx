import { clsx } from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton-shimmer rounded-lg bg-[var(--color-primary-soft)]", className)} />;
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

export function PageTitleSkeleton({ lines = 1 }: { lines?: number }) {
  return (
    <div className="border-b border-[var(--color-border)] px-4 py-4">
      <Skeleton className="h-7 w-36 md:h-8 md:w-44" />
      {Array.from({ length: lines - 1 }).map((_, index) => <Skeleton key={index} className="mt-2 h-4 w-24" />)}
    </div>
  );
}

export function ProductGridSkeleton({ count = 6, className = "product-grid-two p-3 md:p-4" }: { count?: number; className?: string }) {
  return <div className={className}>{Array.from({ length: count }).map((_, index) => <ProductCardSkeleton key={index} />)}</div>;
}
