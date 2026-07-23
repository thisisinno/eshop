import { djangoFetch, TOKEN_COOKIE } from "@/lib/api/django";
import { apiErrorResponse } from "@/lib/api/route-utils";
import type { User } from "@/types/storefront";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type AuthResponse = { token: string; user: User };

export async function POST(request: Request) {
  const payload = await request.json();
  try {
    const auth = await djangoFetch<AuthResponse>("/auth/signin/", { method: "POST", body: JSON.stringify(payload) }, null);
    (await cookies()).set(TOKEN_COOKIE, auth.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return NextResponse.json({ user: auth.user });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
