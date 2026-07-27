"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

function matchesHref(pathname: string, searchParams: URLSearchParams, href: string) {
  const [targetPath, targetQuery] = href.split("?");
  if (pathname !== targetPath) return false;
  if (!targetQuery) return true;
  return Array.from(new URLSearchParams(targetQuery)).every(
    ([key, value]) => searchParams.get(key) === value,
  );
}

export function useRouteFeedback(
  href: string,
  options: { active?: boolean; onNavigate?: () => void } = {},
) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [requested, setRequested] = useState(false);
  const [complete, setComplete] = useState(false);
  const originLocation = useRef("");
  const location = `${pathname}?${searchParams.toString()}`;
  const active = options.active ?? matchesHref(pathname, searchParams, href);

  useEffect(() => {
    if (!requested || !active) return;
    const confirmation = window.setTimeout(() => {
      setRequested(false);
      setComplete(true);
    }, 0);
    return () => window.clearTimeout(confirmation);
  }, [active, requested]);

  useEffect(() => {
    if (!complete) return;
    const reset = window.setTimeout(() => setComplete(false), 2000);
    return () => window.clearTimeout(reset);
  }, [complete]);

  useEffect(() => {
    if (active || (!complete && !(requested && originLocation.current && location !== originLocation.current))) return;
    const reset = window.setTimeout(() => {
      setComplete(false);
      if (requested && originLocation.current && location !== originLocation.current) setRequested(false);
    }, 0);
    return () => window.clearTimeout(reset);
  }, [active, complete, location, requested]);

  useEffect(() => {
    if (!requested) return;
    const failSafe = window.setTimeout(() => setRequested(false), 10000);
    return () => window.clearTimeout(failSafe);
  }, [requested]);

  function onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) return;
    if (active || requested) return;
    event.preventDefault();
    originLocation.current = location;
    setComplete(false);
    setRequested(true);
    options.onNavigate?.();
    startTransition(() => router.push(href));
  }

  return {
    active,
    complete,
    loading: requested || isPending,
    onClick,
  };
}
