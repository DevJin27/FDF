import { parseRequestJson } from "@/lib/http/request";
import { jsonSuccessEnvelope, withErrorHandling } from "@/lib/http/response";
import { sendOtp } from "@/lib/use-cases/auth";

export async function POST(request: Request): Promise<Response> {
  return await withErrorHandling(async () => {
    const payload = await parseRequestJson<{ phone: string }>(request);

    await sendOtp(payload);

    return jsonSuccessEnvelope();
  });
}
