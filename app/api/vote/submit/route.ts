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
  const user = db.prepare('SELECT voting_enabled FROM users WHERE id = ?').get(userId) as any;
  if (!user?.voting_enabled)
    return NextResponse.json({ error: 'Voting not enabled for your account' }, { status: 403 });

  const active = db.prepare(
    'SELECT * FROM voting_sessions WHERE id = ? AND is_open = 1'
  ).get(sessionId) as any;
  if (!active) return NextResponse.json({ error: 'Session not found or already closed' }, { status: 404 });
  if (active.contestant_id === userId)
    return NextResponse.json({ error: "You can't vote for yourself" }, { status: 403 });

  const existing = db.prepare(
    'SELECT id, revote_count FROM votes WHERE voter_id = ? AND session_id = ?'
  ).get(userId, sessionId) as any;

  if (existing) {
    if (existing.revote_count >= 3)
      return NextResponse.json({ error: 'You have used all 3 revotes for this contestant' }, { status: 403 });
    db.prepare(
      'UPDATE votes SET score = ?, revote_count = revote_count + 1, voted_at = datetime(\'now\') WHERE id = ?'
    ).run(Math.round(score), existing.id);
    return NextResponse.json({ ok: true, revotesLeft: 3 - (existing.revote_count + 1) });
  }

  db.prepare(
    'INSERT INTO votes (voter_id, session_id, score) VALUES (?, ?, ?)'
  ).run(userId, sessionId, Math.round(score));
  return NextResponse.json({ ok: true, revotesLeft: 3 });
}