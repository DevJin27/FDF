import { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../shared/http'

export function errorHandler(
  err: Error & { statusCode?: number; code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: err.issues.map((issue) => issue.message).join(', '),
      code: 'VALIDATION_ERROR',
    })
    return
  }

  const statusCode = err instanceof AppError ? err.statusCode : err.statusCode ?? 500
  const code = err instanceof AppError ? err.code : err.code ?? 'INTERNAL_ERROR'

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${statusCode} ${code}: ${err.message}`)
  }

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    code,
  })
}
