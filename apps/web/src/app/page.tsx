import { redirect } from "next/navigation";

import { SignInButton } from "@/components/auth-actions";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  return (
    <div className="grid min-h-[calc(100vh-8rem)] items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[36px] bg-ink p-8 text-white shadow-panel lg:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-citrus/80">
          Jury-ready product loop
        </p>
        <h1 className="mt-4 max-w-2xl text-5xl font-semibold leading-tight">
          Queue Blinkit order intents and form the smallest valid match above ₹200.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-white/72">
          This version solves the actual problem: real authentication, real persistence, live
          queue tracking, deterministic matching, and a leader-led payment flow after the room
          locks.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <SignInButton enabled={googleConfigured} />
          <a
            href="#how-it-works"
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white"
          >
            See the system flow
          </a>
        </div>
        {!googleConfigured ? (
          <p className="mt-4 text-sm text-citrus/80">
            Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to enable sign-in.
          </p>
        ) : null}
      </section>

      <section
        id="how-it-works"
        className="rounded-[36px] border border-black/5 bg-white p-8 shadow-panel lg:p-10"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pine/60">
          Product Flow
        </p>
        <div className="mt-6 space-y-4">
          {[
            "Authenticate with Google so every intent is attached to a real user.",
            "Post a Blinkit amount, deadline, and delivery cluster.",
            "Watch the live queue until the matcher finds the closest valid combination above ₹200.",
            "Enter the match room, let the assigned leader place the real Blinkit order, and settle via UPI."
          ].map((step, index) => (
            <div key={step} className="flex gap-4 rounded-2xl bg-mist px-4 py-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-pine text-sm font-bold text-white">
                {index + 1}
              </div>
              <p className="text-sm leading-7 text-ink/80">{step}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
