import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

async function isAdmin() {
  const s = await getSession();
  return s?.isAdmin === true;
}

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = getDb();

  const active = db.prepare(`
    SELECT vs.id, vs.contestant_id, u.char_name, vs.opened_at,
      (SELECT COUNT(*) FROM votes WHERE session_id = vs.id) as vote_count,
      (SELECT ROUND(AVG(score),2) FROM votes WHERE session_id = vs.id) as avg_score
    FROM voting_sessions vs
    JOIN users u ON u.id = vs.contestant_id
    WHERE vs.is_open = 1 LIMIT 1
  `).get() as any;

  const completed = db.prepare(`
    SELECT vs.id, u.char_name, vs.opened_at, vs.closed_at,
      COUNT(v.id) as vote_count,
      ROUND(AVG(v.score), 2) as avg_score
    FROM voting_sessions vs
    JOIN users u ON u.id = vs.contestant_id
    LEFT JOIN votes v ON v.session_id = vs.id
    WHERE vs.is_open = 0
    GROUP BY vs.id
    ORDER BY avg_score DESC
  `).all();

  const eligible = db.prepare(`
    SELECT id, char_name FROM users
    WHERE voting_enabled = 1
    ORDER BY char_name
  `).all();

  const notVotedYet = active ? db.prepare(`
    SELECT u.char_name FROM users u
    WHERE u.voting_enabled = 1
      AND u.id != ?
      AND u.id NOT IN (
        SELECT voter_id FROM votes WHERE session_id = ?
      )
    ORDER BY u.char_name
  `).all(active.contestant_id, active.id) : [];

  return NextResponse.json({ active: active || null, completed, eligible, notVotedYet });
}

export async function POST(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { contestantId } = await req.json();
  const db = getDb();

  if (db.prepare('SELECT id FROM voting_sessions WHERE is_open = 1').get())
    return NextResponse.json({ error: 'Close the current session first' }, { status: 409 });
  if (!db.prepare('SELECT id FROM users WHERE id = ?').get(contestantId))
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  const existing = db.prepare(
    'SELECT id FROM voting_sessions WHERE contestant_id = ? ORDER BY id DESC LIMIT 1'
  ).get(contestantId) as any;

  if (existing) {
    db.prepare("UPDATE voting_sessions SET is_open = 1, closed_at = NULL, opened_at = datetime('now') WHERE id = ?").run(existing.id);
    return NextResponse.json({ ok: true });
  }

  db.prepare('INSERT INTO voting_sessions (contestant_id) VALUES (?)').run(contestantId);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = getDb();
  const r = db.prepare(
    "UPDATE voting_sessions SET is_open = 0, closed_at = datetime('now') WHERE is_open = 1"
  ).run();
  if (r.changes === 0) return NextResponse.json({ error: 'No active session' }, { status: 404 });
  return NextResponse.json({ ok: true });
}