"use client";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { getCurrentUser, getStoredUser, type DjangoUser } from "@/lib/auth/django-auth-client";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [user, setUser] = useState<DjangoUser | null>(null);
  useEffect(() => { setUser(getStoredUser()); getCurrentUser().then(setUser).catch(() => undefined); }, []);
  return <div className="mx-auto w-full max-w-270"><Breadcrumb pageName="Settings" /><section className="rounded-[10px] bg-white p-7 shadow-1 dark:bg-gray-dark dark:shadow-card"><h1 className="text-xl font-semibold text-dark dark:text-white">Account Settings</h1><dl className="mt-5 grid gap-3 sm:grid-cols-2"><div><dt className="text-sm text-gray-6">Username</dt><dd>{user?.username || "—"}</dd></div><div><dt className="text-sm text-gray-6">Email</dt><dd>{user?.email || "—"}</dd></div></dl></section></div>;
}
