export interface AppUser {
  id: string;
  phone: string;
  name: string;
  upiId: string | null;
  fdfStreak: number;
  fdfUnlockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  phone: string;
  name: string;
  upiId?: string | null;
}

export interface UpdateUserInput {
  name?: string;
  upiId?: string | null;
}

export interface PublicUserProfile {
  id: string;
  phone: string;
  name: string;
  upiId: string | null;
  fdfStreak: number;
  fdfUnlockedUntil: string | null;
}
