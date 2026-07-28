"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import type { StoreFollowResponse } from "@/types/storefront";

export function StoreFollowButton({
  slug,
  storeName,
  initialFollowing,
  initialFollowerCount,
  size = "default",
  onChange,
}: {
  slug: string;
  storeName: string;
  initialFollowing: boolean;
  initialFollowerCount: number;
  size?: "compact" | "default";
  onChange?: (following: boolean, followerCount: number) => void;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [loading, setLoading] = useState(false);
  const [popping, setPopping] = useState(false);
  const popTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (popTimer.current !== null) window.clearTimeout(popTimer.current);
    };
  }, []);

  async function toggle() {
    if (loading) return;
    const previousFollowing = following;
    const previousCount = followerCount;
    const next = !following;
    setFollowing(next);
    setFollowerCount(Math.max(0, previousCount + (next ? 1 : -1)));
    setLoading(true);
    try {
      const response = await fetch(`/api/storefront/stores/${slug}/follow/`, {
        method: next ? "POST" : "DELETE",
      });
      const data = await response.json().catch(() => null) as StoreFollowResponse | { error?: string } | null;
      if (!response.ok || !data || !("is_following" in data)) {
        throw new Error(response.status === 400 ? "anonymous-session" : "follow");
      }
      setFollowing(data.is_following);
      setFollowerCount(data.follower_count);
      setPopping(true);
      popTimer.current = window.setTimeout(() => setPopping(false), 200);
      onChange?.(data.is_following, data.follower_count);
      toast.success(data.is_following ? `Following ${storeName}` : `Unfollowed ${storeName}`);
    } catch (error) {
      setFollowing(previousFollowing);
      setFollowerCount(previousCount);
      toast.error(
        error instanceof Error && error.message === "anonymous-session"
          ? "Refresh SmartWear and try again."
          : `Could not ${next ? "follow" : "unfollow"} this store. Try again.`,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={following ? "outline" : "primary"}
      size={size === "compact" ? "sm" : "md"}
      aria-label={`${following ? "Unfollow" : "Follow"} ${storeName}`}
      aria-pressed={following}
      aria-busy={loading || undefined}
      disabled={loading}
      onClick={toggle}
      className={`${size === "compact" ? "h-9 min-w-[76px] px-2.5 text-xs sm:min-w-[92px] sm:px-3 sm:text-sm" : ""} ${popping ? "scale-[1.04]" : ""}`}
    >
      {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : following ? <Check aria-hidden className="h-4 w-4" /> : null}
      {following ? "Following" : "Follow"}
    </Button>
  );
}

export const FollowButton = StoreFollowButton;
