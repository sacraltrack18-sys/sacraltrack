import { authenticator } from 'otplib';
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export function generateTOTP(): string {
  return authenticator.generate(process.env.TOTP_SECRET!);
}

export function verifyTOTP(token: string): boolean {
  return authenticator.verify({
    token,
    secret: process.env.TOTP_SECRET!
  });
}

export function verifyManagerSession(): { id: string; username: string; role: string } | null {
  try {
    const token = cookies().get('manager_session')?.value;
    if (!token) return null;

    const decoded = verify(token, process.env.JWT_SECRET!) as {
      id: string;
      username: string;
      role: string;
    };

    return decoded;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function generateRandomPassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
} 