import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session || session.isAdmin)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number(session.sub);
  const db = getDb();
  const user = db.prepare('SELECT voting_enabled FROM users WHERE id = ?').get(userId) as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Progress: how many contestants have been voted on (have a session) vs total eligible
  const totalContestants = (db.prepare(
    'SELECT COUNT(*) as c FROM users WHERE voting_enabled = 1'
  ).get() as any).c;

  const ratedContestants = (db.prepare(
    'SELECT COUNT(DISTINCT contestant_id) as c FROM voting_sessions'
  ).get() as any).c;

  const active = db.prepare(`
    SELECT vs.id, vs.contestant_id, u.char_name as contestant_name, vs.opened_at,
      (SELECT COUNT(*) FROM votes WHERE session_id = vs.id) as vote_count
    FROM voting_sessions vs
    JOIN users u ON u.id = vs.contestant_id
    WHERE vs.is_open = 1 LIMIT 1
  `).get() as any;

  if (!active)
    return NextResponse.json({
      session: null,
      votingEnabled: Boolean(user.voting_enabled),
      progress: { rated: ratedContestants, total: totalContestants },
    });

  const myVote = db.prepare(
    'SELECT score FROM votes WHERE voter_id = ? AND session_id = ?'
  ).get(userId, active.id) as any;

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