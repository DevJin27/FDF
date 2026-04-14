import { ItemPublic, OrderPublic, SessionPublic, SettlementPublic, StreakPublic, UserPublic } from './session'

export interface VerifyOtpResponse {
  token: string
  user: UserPublic
}

export interface DashboardData {
  sessions: SessionPublic[]
  streak: StreakPublic | null
  items: ItemPublic[]
}

export type { ItemPublic, OrderPublic, SessionPublic, SettlementPublic, StreakPublic }
