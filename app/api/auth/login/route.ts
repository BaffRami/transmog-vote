import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { charName, password } = await req.json();
    if (!charName || !password)
      return NextResponse.json({ error: 'Character name and password are required' }, { status: 400 });

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE char_name = ?').get(charName.trim()) as any;
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const token = await signToken({ sub: String(user.id), charName: user.char_name, isAdmin: false });
    const res = NextResponse.json({ charName: user.char_name, votingEnabled: Boolean(user.voting_enabled) });
    res.cookies.set('session', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7, sameSite: 'lax' });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
