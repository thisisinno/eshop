import type { ReactNode } from "react";
import { PackageSearch } from "lucide-react";
import { Card } from "./Card";

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <Card className="grid place-items-center px-6 py-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <PackageSearch aria-hidden className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-black">{title}</h2>
      {children ? <p className="mt-2 max-w-sm text-sm text-[var(--color-text-secondary)]">{children}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}
