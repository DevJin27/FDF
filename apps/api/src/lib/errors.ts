export class AppError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = "APP_ERROR"
  ) {
    super(message);
  }
}
