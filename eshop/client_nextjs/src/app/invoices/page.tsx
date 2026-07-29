import { InvoiceListTile } from "@/components/invoices/InvoiceListTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { serverGet } from "@/lib/api/django";
import type { Invoice } from "@/types/storefront";

export default async function InvoicesPage() {
  const invoices = await serverGet<Invoice[]>("/storefront/invoices/mine/");
  return <section><header className="border-b px-4 py-4"><h1 className="text-2xl font-black md:text-3xl">Invoices</h1></header>{invoices.length ? <div className="divide-y">{invoices.map((invoice) => <InvoiceListTile key={invoice.id} invoice={invoice} />)}</div> : <EmptyState title="No invoices yet">Cart and order invoices will appear here.</EmptyState>}</section>;
}
