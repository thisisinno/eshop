"use client";

import { useScrollDirectionVisibility } from "@/hooks/useScrollDirectionVisibility";

export function CollectionHeader({ title }: { title: string }) {
  const { visible } = useScrollDirectionVisibility();

  return (
    <div className={`sticky top-[58px] z-20 border-b border-[var(--color-border)] bg-white/95 px-3 py-3 backdrop-blur transition-transform duration-180 ease-out motion-reduce:transition-none md:top-0 md:px-4 ${visible ? "translate-y-0" : "-translate-y-full"}`}>
      <h1 className="text-2xl font-black">{title}</h1>
    </div>
  );
}
