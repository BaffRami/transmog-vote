import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const getSecret = () =>
  new TextEncoder().encode(
    process.env.JWT_SECRET || 'fnatics-wow-guild-secret-change-this-in-production'
  );

export interface UserPayload {
  sub: string;
  charName: string;
  isAdmin: false;
}
export interface AdminPayload {
  sub: 'admin';
  isAdmin: true;
}
export type SessionPayload = UserPayload | AdminPayload;

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get('session')?.value;
  if (!token) return null;
  return verifyToken(token);
}
