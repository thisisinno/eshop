"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch(`/api/auth/${mode}/`, { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });
    setLoading(false);
    if (!response.ok) { toast.error("Authentication failed."); return; }
    router.replace("/");
    router.refresh();
  }
  return <form onSubmit={submit} className="mx-auto max-w-md rounded-lg bg-white p-6"><h1 className="text-2xl font-black">{mode === "sign-in" ? "Sign in" : "Create account"}</h1>{mode === "sign-up" && <><input className="mt-4 w-full rounded border p-3" name="username" placeholder="Username" required /><input className="mt-3 w-full rounded border p-3" name="email" type="email" placeholder="Email" required /></>}<input className="mt-4 w-full rounded border p-3" name="email_or_username" placeholder="Email or username" required={mode === "sign-in"} /><input className="mt-3 w-full rounded border p-3" name="password" type="password" placeholder="Password" required /><input className="mt-3 w-full rounded border p-3" name="confirm_password" type="password" placeholder="Confirm password" required={mode === "sign-up"} /><button disabled={loading} className="mt-5 w-full rounded-lg bg-[#5b2cff] py-3 font-bold text-white">{loading ? "Working..." : mode === "sign-in" ? "Sign in" : "Sign up"}</button></form>;
}
