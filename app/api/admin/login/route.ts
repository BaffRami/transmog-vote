import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (password !== (process.env.ADMIN_PASSWORD || 'fnatics-admin'))
    return NextResponse.json({ error: 'Invalid admin password' }, { status: 401 });
  const token = await signToken({ sub: 'admin', isAdmin: true });
  const res = NextResponse.json({ ok: true });
  res.cookies.set('session', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24, sameSite: 'lax' });
  return res;
}
