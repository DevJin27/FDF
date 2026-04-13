// Errors
export { AppError } from "./errors/app-error.js";
export type { HttpErrorCode } from "./errors/app-error.js";

// Types
export type {
  SessionUser,
  UserProfile,
  ApiSuccessBody,
  ApiErrorBody,
  ApiBody,
} from "./types/domain.js";
export { buildSuccessBody, toUserProfile, toSessionUser } from "./types/domain.js";
export type {
  IUserRepository,
  IOTPStore,
  ISMSProvider,
  IOTPService,
} from "./types/interfaces.js";

// Validation
export {
  phoneSchema,
  otpSchema,
  sendOtpSchema,
  verifyOtpSchema,
  updateUserSchema,
} from "./validation/schemas.js";
export type {
  SendOtpInput,
  VerifyOtpInput,
  UpdateUserInput,
} from "./validation/schemas.js";

// Repositories
export { UserRepository } from "./repositories/user.repository.js";
export { OTPCodeRepository } from "./repositories/otp-code.repository.js";

// Services
export { OTPService } from "./services/otp.service.js";

// Providers
export { MSG91SMSProvider } from "./providers/msg91-sms.provider.js";

// Session
export {
  issueSessionToken,
  verifySessionToken,
  extractBearerToken,
  SESSION_MAX_AGE_SECONDS,
} from "./session/session-token.js";

// Use-cases
export { sendOtp, authenticatePhoneOtp } from "./use-cases/auth.js";
export { getUserProfile, updateUserProfile } from "./use-cases/users.js";
export type { AuthContainer } from "./use-cases/auth.js";
export type { UsersContainer } from "./use-cases/users.js";
