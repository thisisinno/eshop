"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

export function FollowButton({ slug, initialFollowing }: { slug: string; initialFollowing: boolean }) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  async function toggle() {
    const next = !following;
    setFollowing(next);
    setLoading(true);
    const response = await fetch(`/api/storefront/stores/${slug}/follow/`, { method: next ? "POST" : "DELETE" });
    setLoading(false);
    if (response.status === 401) {
      setFollowing(!next);
      toast.error("Sign in to follow stores.");
      router.push("/auth/sign-in");
      return;
    }
    if (!response.ok) {
      setFollowing(!next);
      toast.error("Could not update follow status.");
      return;
    }
    toast.success(next ? "Store followed" : "Store unfollowed");
    router.refresh();
  }
  return (
    <Button variant={following ? "outline" : "primary"} loading={loading} onClick={toggle}>
      {following ? <Check aria-hidden className="h-4 w-4" /> : null}
      {following ? "Following" : "Follow"}
    </Button>
  );
}
