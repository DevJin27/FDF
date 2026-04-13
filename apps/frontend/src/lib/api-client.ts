// Inline types — mirror shapes from @fdf/domain to avoid cross-app module resolution issues
type SessionUser = { id: string; phone: string; name: string };
type UserProfile = {
  id: string;
  phone: string;
  name: string;
  upi_id: string | null;
  fdf_streak: number;
  fdf_unlocked_until: Date | null;
  created_at: Date;
};
type ApiSuccessBody<T> = { success: true; data: T };
type ApiErrorBody = { success: false; error: { message: string; code: string } };
type ApiBody<T> = ApiSuccessBody<T> | ApiErrorBody;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export class ApiError extends Error {
  constructor(public statusCode: number, public code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("fdf_token") : null;
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = (await res.json()) as ApiBody<T>;

  if (!res.ok || !data.success) {
    const errorData = !data.success && data.error ? data.error : { message: "Unknown error", code: "UNKNOWN" };
    throw new ApiError(res.status, errorData.code, errorData.message);
  }

  return data.data;
}

export const api = {
  auth: {
    sendOtp: (phone: string) =>
      request<{ sent: boolean }>("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone }),
      }),
    verifyOtp: (phone: string, otp: string) =>
      request<{ token: string; user: SessionUser }>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone, otp }),
      }),
  },
  user: {
    getProfile: (id: string) => request<UserProfile>(`/users/${id}`),
    updateProfile: (id: string, updates: { name?: string; upi_id?: string | null }) =>
      request<UserProfile>(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }),
  },
};
