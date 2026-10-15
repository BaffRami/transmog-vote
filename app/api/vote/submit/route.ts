import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.isAdmin)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = Number(session.sub);
    const { sessionId, score } = await req.json();

    if (!sessionId || typeof score !== 'number' || score < 1 || score > 10)
      return NextResponse.json({ error: 'Invalid score (must be 1–10)' }, { status: 400 });

    const db = getDb();

    const userRes = await db.execute({
      sql: 'SELECT voting_enabled FROM users WHERE id = ?',
      args: [userId],
    });
    const user = userRes.rows[0] as any;
    if (!user || !Number(user.voting_enabled))
      return NextResponse.json({ error: 'Voting not enabled for your account' }, { status: 403 });

    const activeRes = await db.execute({
      sql: 'SELECT * FROM voting_sessions WHERE id = ? AND is_open = 1',
      args: [sessionId],
    });
    const active = activeRes.rows[0] as any;
    if (!active)
      return NextResponse.json({ error: 'Session not found or already closed' }, { status: 404 });
    if (Number(active.contestant_id) === userId)
      return NextResponse.json({ error: "You can't vote for yourself" }, { status: 403 });

    const existingRes = await db.execute({
      sql: 'SELECT id, revote_count FROM votes WHERE voter_id = ? AND session_id = ?',
      args: [userId, sessionId],
    });
    const existing = existingRes.rows[0] as any;

    if (existing) {
      const revoteCount = Number(existing.revote_count);
      if (revoteCount >= 3)
        return NextResponse.json({ error: 'You have used all 3 revotes for this contestant' }, { status: 403 });
      await db.execute({
        sql: "UPDATE votes SET score = ?, revote_count = revote_count + 1, voted_at = datetime('now') WHERE id = ?",
        args: [Math.round(score), existing.id],
      });
      return NextResponse.json({ ok: true, revotesLeft: 3 - (revoteCount + 1) });
    }

    await db.execute({
      sql: 'INSERT INTO votes (voter_id, session_id, score) VALUES (?, ?, ?)',
      args: [userId, sessionId, Math.round(score)],
    });
    return NextResponse.json({ ok: true, revotesLeft: 3 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}