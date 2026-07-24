"use client";

import { Check } from "lucide-react";

export function VerifiedBusinessBadge({ className = "" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Verified business"
      title="Verified business"
      tabIndex={0}
      className={`inline-grid shrink-0 place-items-center rounded-full bg-[#1d9bf0] text-white outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#1d9bf0] ${className || "h-4 w-4"}`}
    >
      <Check aria-hidden className="h-[70%] w-[70%]" strokeWidth={3.5} />
    </span>
  );
}
