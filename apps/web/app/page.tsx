'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { AppShell, PageSection } from '../components/layout/app-shell'
import { SessionCard } from '../components/session/session-card'
import { Button } from '../components/ui/button'
import { Field, Input } from '../components/ui/input'
import { apiFetch } from '../lib/api-client'
import { getAuthToken, setAuthToken } from '../lib/auth-token'
import { formatCurrency } from '../lib/formatters'
import { ItemPublic, SessionPublic, StreakPublic } from '../types/session'
import { VerifyOtpResponse } from '../types/api'

type AuthStep = 'LOGIN' | 'OTP' | 'DASHBOARD'

const heroImage = 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80'

export default function Home() {
  const [step, setStep] = useState<AuthStep>('LOGIN')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [sessions, setSessions] = useState<SessionPublic[]>([])
  const [items, setItems] = useState<ItemPublic[]>([])
  const [streak, setStreak] = useState<StreakPublic | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [owned, joined, streakData, itemData] = await Promise.all([
        apiFetch<SessionPublic[]>('/api/sessions/my'),
        apiFetch<SessionPublic[]>('/api/sessions/joined'),
        apiFetch<StreakPublic>('/api/users/me/streak').catch(() => null),
        apiFetch<ItemPublic[]>('/api/items').catch(() => []),
      ])
      const merged = [...owned, ...joined].filter((session, index, all) => index === all.findIndex((entry) => entry.id === session.id))
      setSessions(merged)
      setStreak(streakData)
      setItems(itemData)
      setStep('DASHBOARD')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard')
      setStep('LOGIN')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (getAuthToken()) {
      loadDashboard()
    } else {
      setLoading(false)
    }
  }, [loadDashboard])

  async function submitPhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await apiFetch('/api/auth/otp/send', { method: 'POST', body: JSON.stringify({ phone }) })
      setStep('OTP')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send OTP')
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await apiFetch<VerifyOtpResponse>('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code: otp, name: `FDF ${phone.slice(-4)}` }),
      })
      setAuthToken(response.token)
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify OTP')
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    return {
      open: sessions.filter((session) => session.status === 'OPEN').length,
      saved: sessions.reduce((sum, session) => sum + Math.max(0, session.minOrder - session.cartItems.reduce((cart, item) => cart + item.price * item.quantity, 0)), 0),
    }
  }, [sessions])

  return (
    <AppShell>
      <PageSection className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-10">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">Free Delivery Forever</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
            Build one shared cart, hit the minimum, settle without the mess.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
            Start a room, invite neighbours, add items, lock the cart, and split payments after the host places the order.
          </p>

          {step !== 'DASHBOARD' && (
            <div className="mt-8 max-w-md rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              {step === 'LOGIN' ? (
                <form onSubmit={submitPhone} className="space-y-4">
                  <Field label="Phone number">
                    <Input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="9876543210" required />
                  </Field>
                  <Button type="submit" className="w-full" disabled={loading || phone.length < 10}>
                    {loading ? 'Sending OTP...' : 'Get OTP'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={verifyOtp} className="space-y-4">
                  <Field label="Local OTP" hint="For this MVP, check the API terminal console for the code.">
                    <Input value={otp} onChange={(event) => setOtp(event.target.value)} inputMode="numeric" maxLength={6} placeholder="123456" required />
                  </Field>
                  <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                    {loading ? 'Checking...' : 'Verify and continue'}
                  </Button>
                </form>
              )}
              {error && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            </div>
          )}
        </div>

        <div className="relative min-h-[320px] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <Image src={heroImage} alt="Fresh delivery ingredients on a shared table" fill priority sizes="(min-width: 1024px) 520px, 100vw" className="object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-white/90 p-4 backdrop-blur">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-zinc-950">{sessions.length}</p>
                <p className="text-xs text-zinc-500">Rooms</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-950">{stats.open}</p>
                <p className="text-xs text-zinc-500">Open</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-950">{streak?.count ?? 0}</p>
                <p className="text-xs text-zinc-500">Streak</p>
              </div>
            </div>
          </div>
        </div>
      </PageSection>

      {step === 'DASHBOARD' && (
        <PageSection className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Your sessions</h2>
                <p className="mt-1 text-sm text-zinc-500">Pick up where the group cart left off.</p>
              </div>
              <Link href="/session/create">
                <Button type="button">Start a session</Button>
              </Link>
            </div>

            {sessions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center">
                <p className="font-semibold text-zinc-900">No sessions yet</p>
                <p className="mt-1 text-sm text-zinc-500">Create one and share the invite code with your floor.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {sessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <h2 className="font-semibold text-zinc-950">Quick catalog</h2>
              <p className="mt-1 text-sm text-zinc-500">Items come from `GET /api/items`.</p>
              <div className="mt-4 space-y-3">
                {items.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-zinc-900">{item.name}</p>
                      <p className="text-sm text-zinc-500">{item.platform}</p>
                    </div>
                    <span className="font-semibold">{formatCurrency(item.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </PageSection>
      )}
    </AppShell>
  )
}
