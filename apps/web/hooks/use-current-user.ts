'use client'

import { useState } from 'react'
import { decodeCurrentUser, getAuthToken } from '../lib/auth-token'

export function useCurrentUser() {
  const [user] = useState(() => decodeCurrentUser(getAuthToken()))

  return user
}
