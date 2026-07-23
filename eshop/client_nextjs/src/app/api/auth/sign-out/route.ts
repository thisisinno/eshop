import { djangoFetch, TOKEN_COOKIE } from "@/lib/api/django";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    await djangoFetch("/auth/signout/", { method: "POST" });
  } catch {
  }
  (await cookies()).delete(TOKEN_COOKIE);
  return NextResponse.redirect(new URL("/", request.url));
}
