import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session || session.isAdmin) return NextResponse.json({ user: null });
  const db = getDb();
  const user = db.prepare('SELECT id, char_name, voting_enabled, code FROM users WHERE id = ?').get(Number(session.sub)) as any;
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: { id: user.id, charName: user.char_name, votingEnabled: Boolean(user.voting_enabled), code: user.code },
  });
}