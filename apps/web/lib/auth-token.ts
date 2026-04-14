import { CurrentUser } from '../types/session'

export function setAuthToken(token: string): void {
  localStorage.setItem('fdf_token', token)
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('fdf_token')
}

export function clearAuthToken(): void {
  localStorage.removeItem('fdf_token')
}

export function decodeCurrentUser(token: string | null): CurrentUser | null {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as CurrentUser
    return payload.userId && payload.phone ? payload : null
  } catch {
    return null
  }
}
