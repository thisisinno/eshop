import { djangoFetch, TOKEN_COOKIE } from "@/lib/api/django";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await djangoFetch("/auth/signout/", { method: "POST" });
  } catch {
  }
  (await cookies()).delete(TOKEN_COOKIE);
  return new NextResponse(null, { status: 204 });
}
