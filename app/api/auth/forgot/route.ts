import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { charName } = await req.json();
  if (!charName) return NextResponse.json({ error: 'Character name required' }, { status: 400 });
  
  const db = getDb();
  
  // Changed .prepare().get() to await db.execute()
  const result = await db.execute({
    sql: 'SELECT id FROM users WHERE char_name = ?',
    args: [charName.trim()]
  });
  const user = result.rows[0] as any;
  
  if (!user) return NextResponse.json({ error: 'Character not found' }, { status: 404 });
  
  // Changed .prepare().run() to await db.execute()
  await db.execute({
    sql: 'UPDATE users SET reset_requested = 1 WHERE id = ?',
    args: [user.id]
  });
  
  return NextResponse.json({ ok: true });
}
