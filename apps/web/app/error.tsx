'use client'

import { Button } from '../components/ui/button'

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-stone-50 px-4">
      <div className="max-w-md rounded-lg border border-zinc-200 bg-white p-6 text-center">
        <h1 className="text-xl font-bold text-zinc-950">Something went sideways</h1>
        <p className="mt-2 text-sm text-zinc-500">Refresh this view and we will try the flow again.</p>
        <Button type="button" className="mt-5" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  )
}
