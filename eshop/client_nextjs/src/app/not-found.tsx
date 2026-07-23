import Link from "next/link";

export default function NotFound() {
  return <section className="rounded-lg bg-white p-6 text-center"><h1 className="text-2xl font-black">Not found</h1><p className="mt-2 text-sm text-black/60">This page or product is not available.</p><Link href="/" className="mt-5 inline-block rounded-lg bg-[#5b2cff] px-5 py-3 font-bold text-white">Go home</Link></section>;
}
