import type { ISMSProvider } from "../types/interfaces.js";

interface MSG91Config {
  authKey: string;
  senderId: string;
  dltTemplateId: string;
  messageTemplate: string;
}

export class MSG91SMSProvider implements ISMSProvider {
  constructor(private readonly config: MSG91Config) {}

  async sendOTP(phone: string, otp: string): Promise<void> {
    const message = this.config.messageTemplate.replace("{otp}", otp);
    const url = "https://api.msg91.com/api/sendhttp.php";

    const params = new URLSearchParams({
      authkey: this.config.authKey,
      mobiles: phone,
      message,
      sender: this.config.senderId,
      route: "4",
      DLT_TE_ID: this.config.dltTemplateId,
    });

    const response = await fetch(`${url}?${params.toString()}`);
    const body = await response.text();

    if (!response.ok || body.toLowerCase().startsWith("error")) {
      throw new Error(`MSG91 error: ${body}`);
    }
  }
}
