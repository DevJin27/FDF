import { getEnv } from "../config/env";
import { AuthenticatedUser } from "../lib/domain";
import { verifyInternalToken } from "../lib/internal-token";
import { UserRepository } from "../repositories/user-repository";

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async authenticateBearerToken(token: string): Promise<AuthenticatedUser> {
    const payload = verifyInternalToken(token, getEnv().INTERNAL_API_SECRET);
    const user = await this.userRepository.ensureFromAuth({
      id: payload.userId,
      email: payload.email,
      name: payload.name,
      image: payload.image
    });

    return {
      id: user?.id ?? payload.userId,
      email: user?.email ?? payload.email,
      name: user?.name ?? payload.name,
      image: user?.image ?? payload.image
    };
  }
}
