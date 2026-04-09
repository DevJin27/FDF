export function normalizeIndianPhone(phone: string): string {
  return `+91${phone}`;
}

export function createFallbackUserName(phone: string): string {
  return `Guest ${phone.slice(-4)}`;
}
