import { PageSection } from '../components/layout/app-shell'

export default function Loading() {
  return (
    <PageSection className="space-y-4">
      <div className="h-32 animate-pulse rounded-lg bg-zinc-200" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-40 animate-pulse rounded-lg bg-zinc-200" />
        <div className="h-40 animate-pulse rounded-lg bg-zinc-200" />
        <div className="h-40 animate-pulse rounded-lg bg-zinc-200" />
      </div>
    </PageSection>
  )
}
