import { createDb } from "@fdf/db";
import {
  OTPCodeRepository,
  OTPService,
  UserRepository,
  // MSG91SMSProvider,   ← OTP integration disabled for now
  ConsoleSMSProvider,   //   using console provider instead (logs OTP to terminal)
} from "@fdf/domain";
import type { IOTPService, IOTPStore, ISMSProvider, IUserRepository } from "@fdf/domain";
import type { Database } from "@fdf/db";

export interface AppContainer {
  db: Database;
  otpStore: IOTPStore;
  otpService: IOTPService;
  smsProvider: ISMSProvider;
  userRepository: IUserRepository;
}

let _container: AppContainer | null = null;

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

// function optionalEnv(key: string, fallback: string): string {
//   return process.env[key] ?? fallback;
// }

export function createContainer(
  overrides: Partial<AppContainer> = {},
): AppContainer {
  const db = overrides.db ?? createDb(requireEnv("DATABASE_URL"));

  // ── OTP / SMS provider ─────────────────────────────────────────────────────
  // OTP integration via MSG91 is temporarily disabled.
  // To re-enable, swap ConsoleSMSProvider for MSG91SMSProvider and
  // restore the requireEnv calls for MSG91_AUTH_KEY, MSG91_SENDER_ID, MSG91_DLT_TE_ID.
  const smsProvider: ISMSProvider =
    overrides.smsProvider ??
    new ConsoleSMSProvider();
  //  new MSG91SMSProvider({
  //    authKey: requireEnv("MSG91_AUTH_KEY"),
  //    senderId: requireEnv("MSG91_SENDER_ID"),
  //    dltTemplateId: requireEnv("MSG91_DLT_TE_ID"),
  //    messageTemplate: optionalEnv(
  //      "MSG91_OTP_MESSAGE_TEMPLATE",
  //      "<#> Your FDF OTP is {otp}. It expires in 5 minutes.",
  //    ),
  //  });

  const otpStore = overrides.otpStore ?? new OTPCodeRepository(db);
  const userRepository = overrides.userRepository ?? new UserRepository(db);
  const otpService =
    overrides.otpService ?? new OTPService(otpStore, smsProvider);

  return { db, otpStore, otpService, smsProvider, userRepository };
}

export function getContainer(): AppContainer {
  if (!_container) _container = createContainer();
  return _container;
}

export function setContainerForTesting(c: AppContainer | null): void {
  _container = c;
}
