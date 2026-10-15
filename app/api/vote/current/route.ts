import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.isAdmin)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = Number(session.sub);
    const db = getDb();

    const userRes = await db.execute({
      sql: 'SELECT voting_enabled, revotes_remaining FROM users WHERE id = ?',
      args: [userId],
    });
    const user = userRes.rows[0] as any;
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const revotesLeft = Number(user.revotes_remaining);

    const totalRes = await db.execute('SELECT COUNT(*) as c FROM users WHERE voting_enabled = 1');
    const totalContestants = Number((totalRes.rows[0] as any)?.c ?? 0);

    const ratedRes = await db.execute('SELECT COUNT(DISTINCT contestant_id) as c FROM voting_sessions');
    const ratedContestants = Number((ratedRes.rows[0] as any)?.c ?? 0);

    const recapRes = await db.execute({
      sql: `
        SELECT u.char_name as contestant_name, v.score, v.revote_count
        FROM votes v
        JOIN voting_sessions vs ON vs.id = v.session_id
        JOIN users u ON u.id = vs.contestant_id
        WHERE v.voter_id = ?
        ORDER BY v.voted_at DESC
      `,
      args: [userId],
    });
    const myRecap = recapRes.rows.map((r: any) => ({
      contestant_name: r.contestant_name,
      score: Number(r.score),
      revote_count: Number(r.revote_count),
    }));

    const activeRes = await db.execute(`
      SELECT vs.id, vs.contestant_id, u.char_name as contestant_name, vs.opened_at,
        (SELECT COUNT(*) FROM votes WHERE session_id = vs.id) as vote_count
      FROM voting_sessions vs
      JOIN users u ON u.id = vs.contestant_id
      WHERE vs.is_open = 1 LIMIT 1
    `);
    const active = activeRes.rows[0] as any;

    const progress = { rated: ratedContestants, total: totalContestants };

    if (!active)
      return NextResponse.json({
        session: null,
        votingEnabled: Boolean(user.voting_enabled),
        revotesLeft,
        progress,
        myRecap,
      });

    const myVoteRes = await db.execute({
      sql: 'SELECT score, revote_count FROM votes WHERE voter_id = ? AND session_id = ?',
      args: [userId, active.id],
    });
    const myVote = myVoteRes.rows[0] as any;

    return NextResponse.json({
      votingEnabled: Boolean(user.voting_enabled),
      revotesLeft,
      progress,
      myRecap,
      session: {
        id: Number(active.id),
        contestantId: Number(active.contestant_id),
        contestantName: active.contestant_name,
        openedAt: active.opened_at,
        voteCount: Number(active.vote_count),
        isContestant: Number(active.contestant_id) === userId,
        alreadyVoted: Boolean(myVote),
        myScore: myVote ? Number(myVote.score) : null,
        revotesLeft,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}