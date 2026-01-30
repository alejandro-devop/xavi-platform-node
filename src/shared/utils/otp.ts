export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function encodeOTP(otp: string): string {
  return Buffer.from(otp).toString('base64');
}

export function decodeOTP(encoded: string): string | null {
  try {
    return Buffer.from(encoded, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}
