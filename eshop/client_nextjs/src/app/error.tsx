"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="rounded-lg bg-white p-6 text-center"><h1 className="text-2xl font-black">Something went wrong</h1><button onClick={reset} className="mt-5 rounded-lg bg-[#5b2cff] px-5 py-3 font-bold text-white">Retry</button></section>;
}
