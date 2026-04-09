import type { AppUser, CreateUserInput, UpdateUserInput } from "@/types/user";

export interface IUserRepository {
  findByPhone(phone: string): Promise<AppUser | null>;
  findById(id: string): Promise<AppUser | null>;
  create(input: CreateUserInput): Promise<AppUser>;
  update(id: string, input: UpdateUserInput): Promise<AppUser>;
}
