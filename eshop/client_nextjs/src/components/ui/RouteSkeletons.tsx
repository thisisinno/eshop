import { PageTitleSkeleton, ProductCardSkeleton, ProductGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

function ChipRowSkeleton({ count = 7 }: { count?: number }) {
  return <div className="flex gap-2 overflow-hidden px-3 py-3 md:px-4">{Array.from({ length: count }).map((_, index) => <Skeleton key={index} className="h-9 w-24 shrink-0 rounded-full" />)}</div>;
}

function ProductRows({ count = 3 }: { count?: number }) {
  return <div className="divide-y divide-[var(--color-border)]">{Array.from({ length: count }).map((_, index) => <div key={index} className="grid grid-cols-[118px_minmax(0,1fr)] gap-3 bg-white p-4"><Skeleton className="aspect-square rounded-lg" /><div className="min-w-0 pt-1"><Skeleton className="h-4 w-4/5" /><Skeleton className="mt-2 h-3 w-2/5" /><Skeleton className="mt-4 h-5 w-28" /><div className="mt-6 flex justify-between"><Skeleton className="h-8 w-24 rounded-full" /><Skeleton className="h-8 w-8 rounded-full" /></div></div></div>)}</div>;
}

export function HomeSkeleton() {
  return (
    <>
      <div className="sticky top-[58px] z-20 bg-white/95 backdrop-blur md:top-0">
        <div className="grid grid-cols-2 border-b border-[var(--color-border)] px-8 py-4"><Skeleton className="mx-auto h-5 w-20" /><Skeleton className="mx-auto h-5 w-24" /></div>
        <ChipRowSkeleton />
      </div>
      {[0, 1].map((section) => <section key={section} className="border-b border-[var(--color-border)] px-3 py-5 md:px-4"><Skeleton className="mb-4 h-6 w-40" /><div className="shelf-scroll"><ProductCardSkeleton /><ProductCardSkeleton /></div></section>)}
    </>
  );
}

export function ProductDetailSkeleton() {
  return (
    <article>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,.95fr)] lg:items-start">
        <section>
          <div className="mb-3 grid grid-cols-2 border-b border-[var(--color-border)] p-4"><Skeleton className="mx-auto h-5 w-20" /><Skeleton className="mx-auto h-5 w-20" /></div>
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="mt-3 flex gap-2 overflow-hidden px-3 pb-2">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16 w-16 shrink-0 rounded-md" />)}</div>
        </section>
        <section className="border-t border-[var(--color-border)] bg-white p-4 md:border-t-0 md:p-5">
          <Skeleton className="h-4 w-36" /><Skeleton className="mt-3 h-6 w-11/12" /><Skeleton className="mt-2 h-6 w-2/3" /><Skeleton className="mt-4 h-8 w-40" /><Skeleton className="mt-4 h-4 w-24" /><Skeleton className="mt-2 h-4 w-36" /><Skeleton className="mt-4 h-9 w-28 rounded-full" /><div className="mt-5 flex gap-3"><Skeleton className="h-11 flex-1 rounded-full" /><Skeleton className="h-11 flex-1 rounded-full" /></div><div className="mt-3 flex gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-10 w-24 rounded-full" /></div>
        </section>
      </div>
      <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">{["Description", "Specifications", "Delivery", "Store information"].map((label) => <div key={label} className="flex h-14 items-center justify-between px-4"><Skeleton className="h-4 w-36" /><Skeleton className="h-5 w-5 rounded-full" /></div>)}</div>
      <section className="border-b border-[var(--color-border)] px-3 py-5 md:px-4"><Skeleton className="mb-4 h-6 w-40" /><div className="shelf-scroll"><ProductCardSkeleton /><ProductCardSkeleton /></div></section>
    </article>
  );
}

export function CategoriesSkeleton() {
  return <section><PageTitleSkeleton /><div className="grid grid-cols-2 gap-3 p-3 md:p-4">{Array.from({ length: 8 }).map((_, index) => <div key={index}><Skeleton className="aspect-[4/3] rounded-xl" /><Skeleton className="mt-2 h-5 w-24" /></div>)}</div></section>;
}

export function CategoryProductsSkeleton() {
  return <section><div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-white p-4"><div><Skeleton className="h-8 w-44" /><Skeleton className="mt-2 h-4 w-20" /></div><Skeleton className="h-10 w-28 rounded-full" /></div><ProductGridSkeleton /></section>;
}

export function ListPageSkeleton({ titleWidth = "w-36" }: { titleWidth?: string }) {
  return <section><div className="border-b border-[var(--color-border)] px-4 py-4"><Skeleton className={`h-8 ${titleWidth}`} /></div><ProductGridSkeleton /></section>;
}

export function NotificationsSkeleton() {
  return <section><div className="sticky top-[58px] z-20 bg-white/95 backdrop-blur md:top-0"><PageTitleSkeleton /><div className="grid grid-cols-2 border-b border-[var(--color-border)] px-8 py-4"><Skeleton className="mx-auto h-5 w-20" /><Skeleton className="mx-auto h-5 w-24" /></div></div>{Array.from({ length: 6 }).map((_, index) => <div key={index} className="grid grid-cols-[42px_minmax(0,1fr)_12px] gap-3 border-b border-[var(--color-border)] bg-white px-4 py-3"><Skeleton className="h-10 w-10 rounded-full" /><div><Skeleton className="h-4 w-3/5" /><Skeleton className="mt-2 h-4 w-full" /><Skeleton className="mt-1 h-3 w-1/3" /></div><Skeleton className="mt-1 h-2.5 w-2.5 rounded-full" /></div>)}</section>;
}

export function CartSkeleton() {
  return <section><PageTitleSkeleton /> <ProductRows count={3} /><aside className="m-4 border-t border-[var(--color-border)] pt-4"><Skeleton className="h-4 w-full" /><Skeleton className="mt-3 h-4 w-5/6" /><Skeleton className="mt-4 h-11 w-36 rounded-full" /></aside></section>;
}

export function SearchSkeleton() {
  return <section><PageTitleSkeleton lines={2} /><div className="grid gap-3 border-b border-[var(--color-border)] bg-white p-3 sm:grid-cols-[1fr_auto] md:p-4"><Skeleton className="h-11 rounded-full" /><Skeleton className="h-11 rounded-full sm:w-44" /></div><div className="border-b border-[var(--color-border)] px-4 py-2"><Skeleton className="h-3 w-20" /></div><ProductGridSkeleton /></section>;
}

export function StoreProfileSkeleton() {
  return <section><div className="overflow-hidden border-b border-[var(--color-border)] bg-white"><Skeleton className="h-32 rounded-none md:h-44" /><div className="px-4 pb-4"><div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="flex items-end gap-3"><Skeleton className="h-20 w-20 rounded-xl border-4 border-white" /><div className="pb-1"><Skeleton className="h-7 w-48" /><Skeleton className="mt-2 h-4 w-32" /></div></div><Skeleton className="h-10 w-24 rounded-full" /></div><Skeleton className="mt-4 h-4 w-40" /><Skeleton className="mt-3 h-4 w-2/3" /><ChipRowSkeleton count={5} /><Skeleton className="mt-1 h-11 rounded-full" /></div></div><ProductGridSkeleton /></section>;
}

export function OrdersSkeleton() {
  return <section><PageTitleSkeleton />{Array.from({ length: 4 }).map((_, index) => <div key={index} className="grid grid-cols-[124px_1fr] gap-3 border-b border-[var(--color-border)] bg-white p-4"><Skeleton className="aspect-[4/3] rounded-lg" /><div><Skeleton className="h-5 w-32" /><Skeleton className="mt-2 h-4 w-44" /><Skeleton className="mt-4 h-5 w-28" /><Skeleton className="mt-2 h-3 w-48" /></div></div>)}</section>;
}

export function ProfileSkeleton() {
  return <section><div className="border-b border-[var(--color-border)] p-5"><div className="flex items-center gap-4"><Skeleton className="h-16 w-16 rounded-full" /><div><Skeleton className="h-7 w-36" /><Skeleton className="mt-2 h-4 w-48" /></div></div></div>{Array.from({ length: 4 }).map((_, index) => <div key={index} className="flex min-h-14 items-center gap-3 border-b border-[var(--color-border)] px-4"><Skeleton className="h-5 w-5 rounded-full" /><Skeleton className="h-4 w-28" /></div>)}</section>;
}

export function CheckoutSkeleton() {
  return <section><PageTitleSkeleton /><div className="border-b border-[var(--color-border)] p-4"><Skeleton className="h-4 w-full" /><Skeleton className="mt-3 h-4 w-4/5" /><Skeleton className="mt-3 h-4 w-3/5" /></div><div className="space-y-4 p-4">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-11 rounded-full" />)}<Skeleton className="h-11 w-40 rounded-full" /></div></section>;
}

export function ProductComposerSkeleton() {
  return <section className="p-4"><Skeleton className="h-8 w-44" /><div className="mt-5 space-y-4">{Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-11 rounded-lg" />)}<Skeleton className="h-32 rounded-lg" /><Skeleton className="h-11 w-36 rounded-full" /></div></section>;
}
