import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { charName } = await req.json();
  if (!charName) return NextResponse.json({ error: 'Character name required' }, { status: 400 });
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE char_name = ?').get(charName.trim()) as any;
  if (!user) return NextResponse.json({ error: 'Character not found' }, { status: 404 });
  db.prepare('UPDATE users SET reset_requested = 1 WHERE id = ?').run(user.id);
  return NextResponse.json({ ok: true });
}