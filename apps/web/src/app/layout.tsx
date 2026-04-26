import "./globals.css";

import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/auth-actions";

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(216,255,94,0.28),_transparent_32%),linear-gradient(180deg,_#f6fbf8_0%,_#f0f6f2_45%,_#ffffff_100%)] text-ink">
          <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
            <a href="/" className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ink text-sm font-bold text-citrus">
                FDF
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-pine/60">
                  Free Delivery Forever
                </p>
                <p className="text-sm text-ink/70">Blinkit-first order intent matcher</p>
              </div>
            </a>

            {session?.user ? (
              <div className="flex items-center gap-3 rounded-full bg-ink px-3 py-2 text-white">
                <div className="text-right">
                  <p className="text-sm font-semibold">{session.user.name}</p>
                  <p className="text-xs text-white/60">{session.user.email}</p>
                </div>
                <SignOutButton />
              </div>
            ) : null}
          </header>

          <main className="mx-auto max-w-7xl px-6 pb-16">{children}</main>
        </div>
      </body>
    </html>
  );
}
