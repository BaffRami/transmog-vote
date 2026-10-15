import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.isAdmin)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = Number(session.sub);
    const { contestantName, score } = await req.json();

    if (typeof score !== 'number' || score < 1 || score > 10)
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 });

    const db = getDb();

    const userRes = await db.execute({
      sql: 'SELECT revotes_remaining, voting_enabled FROM users WHERE id = ?',
      args: [userId],
    });
    const user = userRes.rows[0] as any;
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!Number(user.voting_enabled))
      return NextResponse.json({ error: 'Voting has been closed.' }, { status: 403 });
    if (Number(user.revotes_remaining) <= 0)
      return NextResponse.json({ error: 'You have used all 3 of your revotes' }, { status: 403 });

    const vsRes = await db.execute({
      sql: `
        SELECT vs.id FROM voting_sessions vs
        JOIN users u ON u.id = vs.contestant_id
        WHERE u.char_name = ? COLLATE NOCASE
        ORDER BY vs.id DESC LIMIT 1
      `,
      args: [contestantName],
    });
    const vs = vsRes.rows[0] as any;
    if (!vs) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const existingRes = await db.execute({
      sql: 'SELECT id FROM votes WHERE voter_id = ? AND session_id = ?',
      args: [userId, vs.id],
    });
    const existing = existingRes.rows[0] as any;
    if (!existing) return NextResponse.json({ error: 'No original vote found' }, { status: 404 });

    // Both updates run together as one transaction
    await db.batch([
      {
        sql: 'UPDATE users SET revotes_remaining = revotes_remaining - 1 WHERE id = ? AND revotes_remaining > 0',
        args: [userId],
      },
      {
        sql: "UPDATE votes SET score = ?, voted_at = datetime('now') WHERE id = ?",
        args: [Math.round(score), existing.id],
      },
    ], 'write');

    const updatedRes = await db.execute({
      sql: 'SELECT revotes_remaining FROM users WHERE id = ?',
      args: [userId],
    });
    const revotesLeft = Number((updatedRes.rows[0] as any)?.revotes_remaining ?? 0);

    return NextResponse.json({ ok: true, revotesLeft });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}