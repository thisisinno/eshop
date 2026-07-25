import { clsx } from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton-shimmer rounded-lg bg-[var(--color-primary-soft)]", className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="flex h-full min-w-0 flex-col bg-white">
      <Skeleton className="aspect-[4/3] w-full" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-1 h-4 w-4/5" />
      <Skeleton className="mt-1 h-5 w-24" />
      <div className="mt-2 flex min-h-11 items-center gap-2 border-t border-[var(--color-border)] pt-2">
        <Skeleton className="h-10 w-10 rounded-full" />
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
