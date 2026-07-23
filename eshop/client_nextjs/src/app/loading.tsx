import { ProductCardSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <ProductCardSkeleton key={index} />)}</div>;
}
