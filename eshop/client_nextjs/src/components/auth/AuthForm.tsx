"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch(`/api/auth/${mode}/`, { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });
    setLoading(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null) as { error?: string; detail?: unknown } | null;
      const message = data?.error || (typeof data?.detail === "string" ? data.detail : "Authentication failed.");
      setError(message);
      toast.error(message);
      return;
    }
    router.replace("/");
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="mx-auto max-w-md rounded-lg border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-black">{mode === "sign-in" ? "Sign in" : "Create account"}</h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{mode === "sign-in" ? "Access your cart, saved products, and orders." : "Create your customer account."}</p>
      {error ? <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
      {mode === "sign-up" ? (
        <>
          <Field icon={<User aria-hidden className="h-4 w-4" />} label="Username" name="username" required />
          <Field icon={<Mail aria-hidden className="h-4 w-4" />} label="Email" name="email" type="email" required />
        </>
      ) : null}
      <Field icon={<Mail aria-hidden className="h-4 w-4" />} label="Email or username" name="email_or_username" required={mode === "sign-in"} />
      <label className="mt-4 block">
        <span className="text-sm font-semibold">Password</span>
        <span className="relative mt-1 block">
          <Lock aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-white pl-10 pr-11 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-4 focus:ring-blue-100" name="password" type={showPassword ? "text" : "password"} required />
          <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-slate-100">{showPassword ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}</button>
        </span>
      </label>
      {mode === "sign-up" ? <Field icon={<Lock aria-hidden className="h-4 w-4" />} label="Confirm password" name="confirm_password" type="password" required /> : null}
      <Button type="submit" loading={loading} className="mt-5 w-full">{mode === "sign-in" ? "Sign in" : "Sign up"}</Button>
      <p className="mt-5 text-center text-sm text-[var(--color-text-secondary)]">
        {mode === "sign-in" ? "New here? " : "Already have an account? "}
        <Link className="font-bold text-[var(--color-primary)]" href={mode === "sign-in" ? "/auth/sign-up" : "/auth/sign-in"}>{mode === "sign-in" ? "Create account" : "Sign in"}</Link>
      </p>
    </form>
  );
}

function Field({ icon, label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode; label: string }) {
  return (
    <label className="mt-4 block">
      <span className="text-sm font-semibold">{label}</span>
      <span className="relative mt-1 block">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        <input className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-white pl-10 pr-3 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-4 focus:ring-blue-100" {...props} />
      </span>
    </label>
  );
}
