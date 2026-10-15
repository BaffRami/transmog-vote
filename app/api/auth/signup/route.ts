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
    
    // 1. Check if username exists using await
    const userCheck = await db.execute({
      sql: 'SELECT id FROM users WHERE char_name = ?',
      args: [name]
    });
    if (userCheck.rows[0])
      return NextResponse.json({ error: 'Character name already registered' }, { status: 409 });

    const hash = await bcrypt.hash(password, 10);

    let code: string;
    let attempts = 0;
    
    // 2. Loop rewritten to await unique code verification over the wire
    while (true) {
      code = makeCode();
      if (++attempts > 50) throw new Error('Code generation failed');
      
      const codeCheck = await db.execute({
        sql: 'SELECT id FROM users WHERE code = ?',
        args: [code]
      });
      
      if (!codeCheck.rows[0]) {
        break; // Unique code found!
      }
    }

    // 3. Final insert via await
    await db.execute({
      sql: 'INSERT INTO users (char_name, password_hash, code) VALUES (?, ?, ?)',
      args: [name, hash, code]
    });
    
    return NextResponse.json({ charName: name, code }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
