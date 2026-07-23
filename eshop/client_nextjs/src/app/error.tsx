"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <EmptyState title="Something went wrong" action={<Button onClick={reset}>Retry</Button>}>The storefront could not finish loading this view.</EmptyState>;
}
