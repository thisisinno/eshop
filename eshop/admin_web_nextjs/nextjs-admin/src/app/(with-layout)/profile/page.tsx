"use client";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { getCurrentUser, getStoredUser, type DjangoUser } from "@/lib/auth/django-auth-client";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [user, setUser] = useState<DjangoUser | null>(null);
  useEffect(() => { setUser(getStoredUser()); getCurrentUser().then(setUser).catch(() => undefined); }, []);
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "User";
  return <div className="mx-auto w-full max-w-242.5"><Breadcrumb pageName="Profile" /><section className="rounded-[10px] bg-white p-8 shadow-1 dark:bg-gray-dark dark:shadow-card"><h1 className="text-2xl font-bold text-dark dark:text-white">{name}</h1><p className="mt-2">{user?.email || ""}</p><p className="mt-5 text-sm">Profile data is managed by the Django account API.</p></section></div>;
}
