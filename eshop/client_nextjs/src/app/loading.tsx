export default function Loading() {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-[292px] animate-pulse rounded-lg bg-white" />)}</div>;
}
