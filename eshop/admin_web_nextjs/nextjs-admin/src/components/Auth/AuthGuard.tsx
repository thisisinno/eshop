"use client";

import { clearAuthStorage, getCurrentUser, getToken } from "@/lib/auth/django-auth-client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type PropsWithChildren } from "react";

const AUTH_PAGES = ["/auth/sign-in", "/auth/sign-up"];

export function AuthGuard({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (AUTH_PAGES.includes(pathname)) {
      setIsChecking(false);
      return;
    }

    const signInUrl = `/auth/sign-in?callbackUrl=${encodeURIComponent(pathname)}`;
    if (!getToken()) {
      router.replace(signInUrl);
      return;
    }

    getCurrentUser()
      .then(() => setIsChecking(false))
      .catch(() => {
        clearAuthStorage();
        router.replace(signInUrl);
      });
  }, [pathname, router]);

  if (!isChecking) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-2 dark:bg-[#020d1a]">
      <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
        Checking your session...
      </div>
    </div>
  );
}
