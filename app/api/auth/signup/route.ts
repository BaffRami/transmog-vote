import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';

function makeCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

export async function POST(req: NextRequest) {
  try {
    const { charName, password } = await req.json();
    if (!charName?.trim() || !password)
      return NextResponse.json({ error: 'Character name and password are required' }, { status: 400 });

    const name = charName.trim();
    if (name.length < 2 || name.length > 20)
      return NextResponse.json({ error: 'Character name must be 2–20 characters' }, { status: 400 });
    if (password.length < 4)
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });

    const db = getDb();
    if (db.prepare('SELECT id FROM users WHERE char_name = ?').get(name))
      return NextResponse.json({ error: 'Character name already registered' }, { status: 409 });

    const hash = await bcrypt.hash(password, 10);

    let code: string;
    let attempts = 0;
    do {
      code = makeCode();
      if (++attempts > 50) throw new Error('Code generation failed');
    } while (db.prepare('SELECT id FROM users WHERE code = ?').get(code));

    db.prepare('INSERT INTO users (char_name, password_hash, code) VALUES (?, ?, ?)').run(name, hash, code);
    return NextResponse.json({ charName: name, code }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
