export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export interface ApiEnvelope<T> {
  success: boolean
  data: T
  error?: string
  code?: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code = 'API_ERROR'
  ) {
    super(message)
  }
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('fdf_token') : null
  const headers = new Headers(options.headers)

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const payload = (await response.json()) as ApiEnvelope<T>
  if (!response.ok || !payload.success) {
    throw new ApiError(payload.error || 'Request failed', payload.code)
  }

  return payload.data
}
