import { cookies } from 'next/headers';
import crypto from 'crypto';

const COOKIE_NAME = 'forceauth_session';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);

// Encrypt data for cookie storage
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'utf-8').slice(0, 32), iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted}`;
}

// Decrypt data from cookie
function decrypt(encryptedText: string): string {
  const [ivBase64, authTagBase64, encrypted] = encryptedText.split('.');
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'utf-8').slice(0, 32), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export interface SessionData {
  accessToken: string;
  refreshToken?: string;
  instanceUrl: string;
  environment: 'production' | 'sandbox';
  issuedAt: number;
  userId: string;
  username: string;
  displayName: string;
  email: string;
  orgId: string;
  orgName?: string;
  clientId?: string; // Stored for PKCE refresh token requests
}

// Get session from encrypted cookie
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    if (!sessionCookie?.value) {
      return null;
    }

    const decrypted = decrypt(sessionCookie.value);
    const session = JSON.parse(decrypted) as SessionData;

    // Check if session is expired (4 hours)
    const fourHoursMs = 4 * 60 * 60 * 1000;
    if (Date.now() - session.issuedAt > fourHoursMs) {
      return null;
    }

    return session;
  } catch (error) {
    console.error('[Session] Failed to get session:', error);
    return null;
  }
}

// Create encrypted session cookie value
export function createSessionCookie(data: SessionData): string {
  return encrypt(JSON.stringify(data));
}

// Cookie options
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 4 * 60 * 60, // 4 hours
};
