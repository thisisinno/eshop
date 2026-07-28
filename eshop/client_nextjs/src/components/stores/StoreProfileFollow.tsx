"use client";

import { useState } from "react";
import { StoreFollowButton } from "./FollowButton";

export function StoreProfileFollow({
  slug,
  storeName,
  initialFollowing,
  initialFollowerCount,
  productCount,
}: {
  slug: string;
  storeName: string;
  initialFollowing: boolean;
  initialFollowerCount: number;
  productCount: number;
}) {
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);

  return (
    <div className="contents">
      <StoreFollowButton
        slug={slug}
        storeName={storeName}
        initialFollowing={initialFollowing}
        initialFollowerCount={initialFollowerCount}
        onChange={(_following, count) => setFollowerCount(count)}
      />
      <p className="mt-4 text-sm text-[var(--color-text-secondary)] sm:col-span-2">
        {followerCount.toLocaleString()} {followerCount === 1 ? "follower" : "followers"} ·{" "}
        {productCount.toLocaleString()} {productCount === 1 ? "product" : "products"}
      </p>
    </div>
  );
}
