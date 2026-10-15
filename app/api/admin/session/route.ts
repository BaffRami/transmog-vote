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

  // 1. Fetch single active session row
  const activeRes = await db.execute(`
    SELECT vs.id, vs.contestant_id, u.char_name, vs.opened_at,
      (SELECT COUNT(*) FROM votes WHERE session_id = vs.id) as vote_count,
      (SELECT ROUND(AVG(score),2) FROM votes WHERE session_id = vs.id) as avg_score
    FROM voting_sessions vs
    JOIN users u ON u.id = vs.contestant_id
    WHERE vs.is_open = 1 LIMIT 1
  `);
  const active = activeRes.rows[0] as any; // Getting the first row directly from the array

  // 2. Fetch completed sessions
  const completedRes = await db.execute(`
    SELECT vs.id, u.char_name, vs.opened_at, vs.closed_at,
      COUNT(v.id) as vote_count,
      ROUND(AVG(v.score), 2) as avg_score
    FROM voting_sessions vs
    JOIN users u ON u.id = vs.contestant_id
    LEFT JOIN votes v ON v.session_id = vs.id
    WHERE vs.is_open = 0
    GROUP BY vs.id
    ORDER BY avg_score DESC
  `);
  const completed = completedRes.rows;

  // 3. Fetch eligible users
  const eligibleRes = await db.execute(`
    SELECT id, char_name FROM users
    WHERE voting_enabled = 1
    ORDER BY char_name
  `);
  const eligible = eligibleRes.rows;

  // 4. Fetch users who haven't voted yet (if there is an active session)
  let notVotedYet: any[] = [];
  if (active) {
    const notVotedRes = await db.execute({
      sql: `
        SELECT u.char_name FROM users u
        WHERE u.voting_enabled = 1
          AND u.id != ?
          AND u.id NOT IN (
            SELECT voter_id FROM votes WHERE session_id = ?
          )
        ORDER BY u.char_name
      `,
      args: [active.contestant_id, active.id]
    });
    notVotedYet = notVotedRes.rows;
  }

  return NextResponse.json({ active: active || null, completed, eligible, notVotedYet });
}

export async function POST(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { contestantId } = await req.json();
  const db = getDb();

  // Check if a session is already open
  const openSessionCheck = await db.execute('SELECT id FROM voting_sessions WHERE is_open = 1');
  if (openSessionCheck.rows[0])
    return NextResponse.json({ error: 'Close the current session first' }, { status: 409 });

  // Check if player exists
  const userCheck = await db.execute({
    sql: 'SELECT id FROM users WHERE id = ?',
    args: [contestantId]
  });
  if (!userCheck.rows[0])
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  // Look for existing session
  const existingRes = await db.execute({
    sql: 'SELECT id FROM voting_sessions WHERE contestant_id = ? ORDER BY id DESC LIMIT 1',
    args: [contestantId]
  });
  const existing = existingRes.rows[0] as any;

  if (existing) {
    await db.execute({
      sql: "UPDATE voting_sessions SET is_open = 1, closed_at = NULL, opened_at = datetime('now') WHERE id = ?",
      args: [existing.id]
    });
    return NextResponse.json({ ok: true });
  }

  await db.execute({
    sql: 'INSERT INTO voting_sessions (contestant_id) VALUES (?)',
    args: [contestantId]
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = getDb();
  
  // Update active session to closed
  const r = await db.execute(
    "UPDATE voting_sessions SET is_open = 0, closed_at = datetime('now') WHERE is_open = 1"
  );
  
  // rowsAffected replaces better-sqlite3's .changes metric
  if (r.rowsAffected === 0) return NextResponse.json({ error: 'No active session' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
