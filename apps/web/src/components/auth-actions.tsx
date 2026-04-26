"use client";

import { signIn, signOut } from "next-auth/react";

export function SignInButton({ enabled }: { enabled: boolean }) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      className="rounded-full bg-citrus px-5 py-3 text-sm font-semibold text-ink transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
    >
      Continue with Google
    </button>
  );
}

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/90"
    >
      Sign out
    </button>
  );
}
