import type { PublicUserProfile } from "@/types";

import { getContainer, type AppContainer } from "@/lib/composition";
import { AppError } from "@/lib/errors/app-error";
import { toPublicUserProfile } from "@/lib/http/response";
import { updateUserSchema, userIdSchema } from "@/lib/validation/auth";

export async function getUserProfile(
  userId: string,
  container: AppContainer = getContainer(),
): Promise<PublicUserProfile> {
  const validUserId = userIdSchema.parse(userId);
  const user = await container.userRepository.findById(validUserId);

  if (!user) {
    throw new AppError(404, "User not found", "USER_NOT_FOUND");
  }

  return toPublicUserProfile(user);
}

export async function updateUserProfile(
  userId: string,
  input: unknown,
  container: AppContainer = getContainer(),
): Promise<PublicUserProfile> {
  const validUserId = userIdSchema.parse(userId);
  const payload = updateUserSchema.parse(input);
  const updatedUser = await container.userRepository.update(validUserId, {
    name: payload.name,
    upiId: payload.upi_id,
  });

  return toPublicUserProfile(updatedUser);
}
