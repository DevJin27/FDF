export type HttpErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNPROCESSABLE"
  | "INTERNAL_ERROR"
  | "INVALID_OTP"
  | "OTP_EXPIRED"
  | "OTP_ALREADY_CONSUMED"
  | "INVALID_SESSION"
  | "INVALID_PHONE";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: HttpErrorCode;

  constructor(
    statusCode: number,
    message: string,
    code: HttpErrorCode = "INTERNAL_ERROR",
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    // Restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}
