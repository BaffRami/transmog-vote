import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.isAdmin)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number(session.sub);
  const { contestantName, score } = await req.json();

  if (typeof score !== 'number' || score < 1 || score > 10)
    return NextResponse.json({ error: 'Invalid score' }, { status: 400 });

  const db = getDb();

  const user = db.prepare('SELECT revotes_remaining, voting_enabled FROM users WHERE id = ?').get(userId) as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (!user.voting_enabled)
    return NextResponse.json({ error: 'Voting has been closed.' }, { status: 403 });
  if (user.revotes_remaining <= 0)
    return NextResponse.json({ error: 'You have used all 3 of your revotes' }, { status: 403 });

  const vs = db.prepare(`
    SELECT vs.id FROM voting_sessions vs
    JOIN users u ON u.id = vs.contestant_id
    WHERE u.char_name = ? COLLATE NOCASE
    ORDER BY vs.id DESC LIMIT 1
  `).get(contestantName) as any;

  if (!vs) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const existing = db.prepare(
    'SELECT id FROM votes WHERE voter_id = ? AND session_id = ?'
  ).get(userId, vs.id) as any;

  if (!existing) return NextResponse.json({ error: 'No original vote found' }, { status: 404 });

  db.prepare('UPDATE users SET revotes_remaining = revotes_remaining - 1 WHERE id = ?').run(userId);
  db.prepare("UPDATE votes SET score = ?, voted_at = datetime('now') WHERE id = ?").run(Math.round(score), existing.id);

  const updated = db.prepare('SELECT revotes_remaining FROM users WHERE id = ?').get(userId) as any;
  return NextResponse.json({ ok: true, revotesLeft: updated.revotes_remaining });
}