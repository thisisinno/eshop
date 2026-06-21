"use client";
import { EmailIcon, PasswordIcon } from "@/assets/icons";
import { signUp } from "@/lib/auth/django-auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import InputGroup from "../FormElements/InputGroup";

export default function SignupWithPassword() {
  const router = useRouter();
  const [data, setData] = useState({ username: "", email: "", first_name: "", last_name: "", password: "", confirm_password: "" });
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const change = (event: React.ChangeEvent<HTMLInputElement>) => setData({ ...data, [event.target.name]: event.target.value });
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(""); try { await signUp(data); toast.success("Sign up successful"); router.replace("/"); } catch (cause) { const message = cause instanceof Error ? cause.message : "Sign up failed"; setError(message); toast.error(message); } finally { setLoading(false); } }
  return <form onSubmit={submit}><div className="grid gap-4"><InputGroup type="text" label="Username" placeholder="Choose a username" name="username" value={data.username} handleChange={change} /><InputGroup type="email" label="Email" placeholder="Enter your email" name="email" value={data.email} handleChange={change} icon={<EmailIcon />} /><InputGroup type="text" label="First name" placeholder="Enter your first name" name="first_name" value={data.first_name} handleChange={change} /><InputGroup type="text" label="Last name" placeholder="Enter your last name" name="last_name" value={data.last_name} handleChange={change} /><InputGroup type="password" label="Password" placeholder="Choose a password" name="password" value={data.password} handleChange={change} icon={<PasswordIcon />} /><InputGroup type="password" label="Confirm password" placeholder="Repeat your password" name="confirm_password" value={data.confirm_password} handleChange={change} icon={<PasswordIcon />} /></div><button type="submit" disabled={loading} className="mt-4.5 flex w-full justify-center rounded-lg bg-primary p-4 font-medium text-white disabled:opacity-70">{loading ? "Signing up…" : "Sign Up"}</button>{error && <p className="mt-4 text-sm text-red-500">{error}</p>}</form>;
}
