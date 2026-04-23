import { z } from "zod";

import {
  isSupportedPlatform,
  type SessionPlatform,
  SessionService,
} from "@/lib/session-service";
import { AppError } from "@/lib/errors/app-error";
import { parseRequestJson } from "@/lib/http/request";
import { jsonSuccess, withErrorHandling } from "@/lib/http/response";
import { requireSessionUser } from "@/lib/session-token";

const createSessionSchema = z.object({
  platform: z
    .string()
    .trim()
    .toLowerCase()
    .refine(isSupportedPlatform, {
      message: "Platform must be blinkit, swiggy, or zepto",
    }),
  minOrderValue: z.coerce
    .number()
    .refine((value) => value > 0, {
      message: "Minimum order value must be greater than 0",
    }),
  deadline: z.coerce.date(),
  deliveryAddress: z.string().trim().min(1, {
    message: "Delivery address is required",
  }),
});

export async function POST(request: Request): Promise<Response> {
  return await withErrorHandling(async () => {
    const sessionUser = await requireSessionUser(request.headers);
    const payload = createSessionSchema.parse(
      await parseRequestJson<Record<string, unknown>>(request),
    );
    const now = Date.now();
    const deadlineMs = payload.deadline.getTime() - now;

    if (deadlineMs < 60_000 || deadlineMs > 10 * 60_000) {
      throw new AppError(
        400,
        "Deadline must be between 1 and 10 minutes from now",
        "INVALID_DEADLINE",
      );
    }

    const sessionService = SessionService.getInstance();
    const result = await sessionService.createSession(sessionUser.id, {
      platform: payload.platform as SessionPlatform,
      minOrderValue: payload.minOrderValue,
      deadline: payload.deadline,
      deliveryAddress: payload.deliveryAddress,
    });

    return jsonSuccess(result, 201);
  });
}
