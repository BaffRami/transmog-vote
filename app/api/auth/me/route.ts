import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session || session.isAdmin) return NextResponse.json({ user: null });
  
  const db = getDb();
  
  // Changed .prepare().get() to await db.execute()
  const result = await db.execute({
    sql: 'SELECT id, char_name, voting_enabled, code FROM users WHERE id = ?',
    args: [Number(session.sub)]
  });
  const user = result.rows[0] as any;
  
  if (!user) return NextResponse.json({ user: null });
  
  return NextResponse.json({
    user: { id: user.id, charName: user.char_name, votingEnabled: Boolean(user.voting_enabled), code: user.code },
  });
}
