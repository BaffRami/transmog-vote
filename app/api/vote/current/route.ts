import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session || session.isAdmin)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number(session.sub);
  const db = getDb();

  // 1. Fetch user validation row via await
  const userRes = await db.execute({
    sql: 'SELECT voting_enabled FROM users WHERE id = ?',
    args: [userId]
  });
  const user = userRes.rows as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // 2. Fetch total eligible contestants count
  const totalRes = await db.execute(
    'SELECT COUNT(*) as c FROM users WHERE voting_enabled = 1'
  );
  const totalContestants = Number((totalRes.rows as any)?.c || 0);

  // 3. Fetch rated distinct contestants count
  const ratedRes = await db.execute(
    'SELECT COUNT(DISTINCT contestant_id) as c FROM voting_sessions'
  );
  const ratedContestants = Number((ratedRes.rows as any)?.c || 0);

  // 4. Fetch the single current active session
  const activeRes = await db.execute(`
    SELECT vs.id, vs.contestant_id, u.char_name as contestant_name, vs.opened_at,
      (SELECT COUNT(*) FROM votes WHERE session_id = vs.id) as vote_count
    FROM voting_sessions vs
    JOIN users u ON u.id = vs.contestant_id
    WHERE vs.is_open = 1 LIMIT 1
  `);
  const active = activeRes.rows as any;

  if (!active)
    return NextResponse.json({
      session: null,
      votingEnabled: Boolean(user.voting_enabled),
      progress: { rated: ratedContestants, total: totalContestants },
    });

  // 5. Fetch the user's personal active vote if it exists
  const myVoteRes = await db.execute({
    sql: 'SELECT score FROM votes WHERE voter_id = ? AND session_id = ?',
    args: [userId, active.id]
  });
  const myVote = myVoteRes.rows as any;

  return NextResponse.json({
    votingEnabled: Boolean(user.voting_enabled),
    progress: { rated: ratedContestants, total: totalContestants },
    session: {
      id: active.id,
      contestantId: active.contestant_id,
      contestantName: active.contestant_name,
      openedAt: active.opened_at,
      voteCount: active.vote_count,
      isContestant: active.contestant_id === userId,
      alreadyVoted: Boolean(myVote),
      myScore: myVote?.score ?? null,
    },
  });
}
