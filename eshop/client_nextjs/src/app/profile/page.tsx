import { getCurrentUser } from "@/lib/auth/session";
import Link from "next/link";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return <Link href="/auth/sign-in">Sign in</Link>;
  return <section className="rounded-lg bg-white p-6"><h1 className="text-2xl font-black">{user.username}</h1><p className="mt-2 text-sm text-black/60">{user.email}</p><p className="mt-4 text-sm">Staff: {user.is_staff ? "Yes" : "No"}</p><form action="/api/auth/sign-out" method="post"><button className="mt-5 rounded-lg bg-[#161225] px-5 py-3 font-bold text-white">Sign out</button></form></section>;
}
