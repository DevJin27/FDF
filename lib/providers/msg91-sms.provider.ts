import { AppError } from "@/lib/errors/app-error";
import type { ISMSProvider } from "@/types";

interface MSG91SMSProviderConfig {
  authKey: string;
  senderId: string;
  dltTemplateId: string;
  messageTemplate: string;
  endpoint?: string;
}

function parseResponseBody(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

export class MSG91SMSProvider implements ISMSProvider {
  private readonly endpoint: string;

  constructor(private readonly config: MSG91SMSProviderConfig) {
    this.endpoint = config.endpoint ?? "https://control.msg91.com/api/sendotp.php";
  }

  async sendOtp(phone: string, otp: string): Promise<void> {
    const body = new URLSearchParams({
      authkey: this.config.authKey,
      mobiles: phone.replace("+", ""),
      sender: this.config.senderId,
      otp,
      message: this.renderMessage(otp),
      DLT_TE_ID: this.config.dltTemplateId,
    });

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: body.toString(),
      cache: "no-store",
    });

    const rawResponse = await response.text();
    const parsedResponse = parseResponseBody(rawResponse);

    if (!response.ok) {
      throw new AppError(502, "Failed to send OTP", "MSG91_SEND_FAILED", {
        status: response.status,
        body: parsedResponse,
      });
    }

    if (
      typeof parsedResponse === "object" &&
      parsedResponse !== null &&
      "type" in parsedResponse &&
      String(parsedResponse.type).toLowerCase() === "error"
    ) {
      throw new AppError(
        502,
        "MSG91 rejected the OTP request",
        "MSG91_SEND_FAILED",
        parsedResponse,
      );
    }
  }

  private renderMessage(otp: string): string {
    return this.config.messageTemplate.replace("{otp}", otp);
  }
}
