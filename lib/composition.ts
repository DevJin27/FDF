import type { Database } from "@/db";
import { createDb } from "@/db";
import { getOptionalEnv, getRequiredEnv } from "@/lib/env";
import { OTPCodeRepository } from "@/lib/repositories/otp-code.repository";
import { UserRepository } from "@/lib/repositories/user.repository";
import { MSG91SMSProvider } from "@/lib/providers/msg91-sms.provider";
import { OTPService } from "@/lib/services/otp.service";
import type { IOTPService, IOTPStore, ISMSProvider, IUserRepository } from "@/types";

export interface AppContainer {
  db: Database;
  otpStore: IOTPStore;
  otpService: IOTPService;
  smsProvider: ISMSProvider;
  userRepository: IUserRepository;
}

let container: AppContainer | null = null;

function createDefaultSMSProvider(): ISMSProvider {
  return new MSG91SMSProvider({
    authKey: getRequiredEnv("MSG91_AUTH_KEY"),
    senderId: getRequiredEnv("MSG91_SENDER_ID"),
    dltTemplateId: getRequiredEnv("MSG91_DLT_TE_ID"),
    messageTemplate:
      getOptionalEnv(
        "MSG91_OTP_MESSAGE_TEMPLATE",
        "<#> Your FDF OTP is {otp}. It expires in 5 minutes.",
      ) ?? "<#> Your FDF OTP is {otp}. It expires in 5 minutes.",
  });
}

export function createContainer(overrides: Partial<AppContainer> = {}): AppContainer {
  const db = overrides.db ?? createDb(getRequiredEnv("DATABASE_URL"));
  const smsProvider = overrides.smsProvider ?? createDefaultSMSProvider();
  const otpStore = overrides.otpStore ?? new OTPCodeRepository(db);
  const userRepository = overrides.userRepository ?? new UserRepository(db);
  const otpService = overrides.otpService ?? new OTPService(otpStore, smsProvider);

  return {
    db,
    otpStore,
    otpService,
    smsProvider,
    userRepository,
  };
}

export function getContainer(): AppContainer {
  if (!container) {
    container = createContainer();
  }

  return container;
}

export function setContainerForTesting(nextContainer: AppContainer | null): void {
  container = nextContainer;
}
