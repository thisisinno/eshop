"use client";
import { EmailIcon, PasswordIcon } from "@/assets/icons";
import { signIn } from "@/lib/auth/django-auth-client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import InputGroup from "../FormElements/InputGroup";

export default function SigninWithPassword() {
  const router = useRouter(); const params = useSearchParams(); const [emailOrUsername, setEmailOrUsername] = useState(""); const [password, setPassword] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(""); try { await signIn(emailOrUsername, password); toast.success("Sign in successful"); router.replace(params.get("callbackUrl") || "/"); } catch (cause) { const message = cause instanceof Error ? cause.message : "Sign in failed"; setError(message); toast.error(message); } finally { setLoading(false); } }
  return <form onSubmit={submit}><InputGroup type="text" label="Email or username" className="mb-4 [&_input]:py-3.75" placeholder="Enter your email or username" name="email_or_username" handleChange={(e) => setEmailOrUsername(e.target.value)} value={emailOrUsername} icon={<EmailIcon />} /><InputGroup type="password" label="Password" className="mb-5 [&_input]:py-3.75" placeholder="Enter your password" name="password" handleChange={(e) => setPassword(e.target.value)} value={password} icon={<PasswordIcon />} /><div className="mb-6 text-right font-medium"><Link href="/auth/sign-in" className="hover:text-primary dark:text-white">Forgot Password?</Link></div><button type="submit" disabled={loading} className="hover:bg-opacity-90 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary p-4 font-medium text-white transition disabled:opacity-70">{loading ? "Signing in…" : "Sign In"}</button>{error && <p className="mt-4 text-sm text-red-500">{error}</p>}</form>;
}
