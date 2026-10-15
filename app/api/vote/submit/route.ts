import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.isAdmin)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number(session.sub);
  const { sessionId, score } = await req.json();

  if (!sessionId || typeof score !== 'number' || score < 1 || score > 10)
    return NextResponse.json({ error: 'Invalid score (must be 1–10)' }, { status: 400 });

  const db = getDb();
  
  // 1. Check user permission via await
  const userRes = await db.execute({
    sql: 'SELECT voting_enabled FROM users WHERE id = ?',
    args: [userId]
  });
  const user = userRes.rows[0] as any;
  if (!user?.voting_enabled)
    return NextResponse.json({ error: 'Voting not enabled for your account' }, { status: 403 });

  // 2. Check active session status via await
  const activeRes = await db.execute({
    sql: 'SELECT * FROM voting_sessions WHERE id = ? AND is_open = 1',
    args: [sessionId]
  });
  const active = activeRes.rows[0] as any;
  if (!active) return NextResponse.json({ error: 'Session not found or already closed' }, { status: 404 });
  if (active.contestant_id === userId)
    return NextResponse.json({ error: "You can't vote for yourself" }, { status: 403 });

  try {
    // 3. Insert vote via await
    await db.execute({
      sql: 'INSERT INTO votes (voter_id, session_id, score) VALUES (?, ?, ?)',
      args: [userId, sessionId, Math.round(score)]
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // LibSQL throws errors similarly, but we verify both standard message fields for safety
    if (e.message?.includes('UNIQUE') || e.code?.includes('UNIQUE'))
      return NextResponse.json({ error: 'Already voted in this session' }, { status: 409 });
    throw e;
  }
}
