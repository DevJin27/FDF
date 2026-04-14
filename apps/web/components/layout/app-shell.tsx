import { ReactNode } from 'react'

export function AppShell({ children }: { children: ReactNode }) {
  return <main className="min-h-dvh bg-stone-50 text-zinc-950">{children}</main>
}

export function PageSection({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 ${className}`}>{children}</section>
}
