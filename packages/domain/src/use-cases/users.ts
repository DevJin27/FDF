import { AppError } from "../errors/app-error.js";
import type { IUserRepository } from "../types/interfaces.js";
import { updateUserSchema } from "../validation/schemas.js";
import { toUserProfile } from "../types/domain.js";
import type { UserProfile } from "../types/domain.js";

export interface UsersContainer {
  userRepository: IUserRepository;
}

export async function getUserProfile(
  id: string,
  container: UsersContainer,
): Promise<UserProfile> {
  const user = await container.userRepository.findById(id);
  if (!user) throw new AppError(404, "User not found", "NOT_FOUND");
  return toUserProfile(user);
}

export async function updateUserProfile(
  id: string,
  rawInput: unknown,
  container: UsersContainer,
): Promise<UserProfile> {
  const result = updateUserSchema.safeParse(rawInput);
  if (!result.success) {
    throw new AppError(
      422,
      result.error.issues[0]?.message ?? "Invalid input",
      "BAD_REQUEST",
    );
  }

  const updated = await container.userRepository.update(id, result.data);
  return toUserProfile(updated);
}
