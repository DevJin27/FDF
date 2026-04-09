export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface SessionUser {
  id: string;
  phone: string;
  name: string;
  upiId: string | null;
}

export interface SessionTokenPayload extends SessionUser {
  sub: string;
  iat?: number;
  exp?: number;
  jti?: string;
}
