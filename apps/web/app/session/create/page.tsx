'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { AppShell, PageSection } from '../../../components/layout/app-shell'
import { Button } from '../../../components/ui/button'
import { Field, Input } from '../../../components/ui/input'
import { apiFetch } from '../../../lib/api-client'
import { SessionPublic, Platform } from '../../../types/session'

const platforms: Platform[] = ['SWIGGY', 'BLINKIT', 'ZEPTO']

export default function CreateSessionPage() {
  const router = useRouter()
  const [platform, setPlatform] = useState<Platform>('SWIGGY')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError('')

    try {
      const session = await apiFetch<SessionPublic>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          name: String(form.get('name') || '').trim(),
          platform,
          minOrder: Number(form.get('minOrder')),
          durationMinutes: Number(form.get('durationMinutes')),
        }),
      })
      router.push(`/session/${session.code}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create session')
      setPending(false)
    }
  }

  return (
    <AppShell>
      <PageSection className="max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          Back to dashboard
        </Link>
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">New room</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-zinc-950">Start a delivery session</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              The host shares a code, members add cart items, then you lock and place the order.
            </p>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <Field label="Session name">
              <Input name="name" defaultValue="Tonight's shared order" required minLength={3} maxLength={80} />
            </Field>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-zinc-800">Platform</p>
              <div className="grid grid-cols-3 gap-2">
                {platforms.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setPlatform(entry)}
                    className={`min-h-12 rounded-lg border px-3 text-sm font-semibold transition ${
                      platform === entry ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                    }`}
                  >
                    {entry}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Minimum order">
                <Input name="minOrder" type="number" min="1" defaultValue="499" required />
              </Field>
              <Field label="Duration in minutes">
                <Input name="durationMinutes" type="number" min="1" max="180" defaultValue="20" required />
              </Field>
            </div>

            {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

            <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
              {pending ? 'Creating...' : 'Create session'}
            </Button>
          </form>
        </div>
      </PageSection>
    </AppShell>
  )
}
