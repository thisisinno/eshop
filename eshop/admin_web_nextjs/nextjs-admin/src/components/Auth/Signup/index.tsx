import Link from "next/link";
import { Suspense } from "react";
import SignupWithPassword from "../SignupWithPassword";

export default function Signup() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div>
        <SignupWithPassword />
      </div>

      <div className="mt-6 text-center">
        <p>
          Already have an account?{" "}
          <Link href="/auth/sign-in" className="text-primary">
            Sign In
          </Link>
        </p>
      </div>
    </Suspense>
  );
}
