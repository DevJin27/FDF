export function getFormNumber(value: FormDataEntryValue | null, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function requiredString(value: FormDataEntryValue | null): string {
  return String(value || '').trim()
}
