"use client";
import { apiGet } from "@/lib/api/client";
import Link from "next/link";
import { useEffect, useState } from "react";
type Invoice = { id: number; invoice_number: string; document_type: string; status: string; currency: string; total_amount: string; order_number: string | null; issued_at: string };
export default function InvoicesPage() {
  const [items, setItems] = useState<Invoice[]>([]); const [query, setQuery] = useState("");
  useEffect(() => { apiGet<Invoice[]>(`/invoices/${query ? `?q=${encodeURIComponent(query)}` : ""}`).then(setItems).catch(() => setItems([])); }, [query]);
  return <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark"><div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-dark dark:text-white">Invoices</h1><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search invoice" className="rounded-lg border px-3 py-2 text-dark" /></div><div className="mt-6 divide-y dark:divide-dark-3">{items.map((invoice) => <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="flex items-center justify-between py-4"><div><h2 className="font-bold text-dark dark:text-white">{invoice.invoice_number}</h2><p className="text-sm capitalize text-dark-5">{invoice.document_type.replace("_", " ")} · {invoice.status} · {invoice.order_number || "No order"}</p></div><strong className="text-dark dark:text-white">{invoice.currency} {Number(invoice.total_amount).toLocaleString()}</strong></Link>)}</div></div>;
}
