export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function encodeVerificationCode(otp: string, userId: number): string {
  const combined = `${otp}${userId}`;
  return Buffer.from(combined).toString('base64');
}

export function decodeVerificationCode(code: string): { otp: string; userId: string } | null {
  try {
    const decoded = Buffer.from(code, 'base64').toString('utf-8');
    const otp = decoded.substring(0, 6);
    const userId = decoded.substring(6);

    if (otp.length !== 6 || !userId) {
      return null;
    }

    return { otp, userId };
  } catch {
    return null;
  }
}
