export interface IOTPService {
  generate(): string;
  store(phone: string, otp: string): Promise<void>;
  verify(phone: string, otp: string): Promise<boolean>;
  invalidate(phone: string): Promise<void>;
}
