import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session || session.isAdmin)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number(session.sub);
  const db = getDb();
  const user = db.prepare('SELECT voting_enabled, revotes_remaining FROM users WHERE id = ?').get(userId) as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const totalContestants = (db.prepare(
    'SELECT COUNT(*) as c FROM users WHERE voting_enabled = 1'
  ).get() as any).c;

  const ratedContestants = (db.prepare(
    'SELECT COUNT(DISTINCT contestant_id) as c FROM voting_sessions'
  ).get() as any).c;

  // My votes recap — all votes I cast across all sessions
  const myRecap = db.prepare(`
    SELECT u.char_name as contestant_name, v.score, v.revote_count
    FROM votes v
    JOIN voting_sessions vs ON vs.id = v.session_id
    JOIN users u ON u.id = vs.contestant_id
    WHERE v.voter_id = ?
    ORDER BY v.voted_at DESC
  `).all(userId);

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
      myRecap,
    });

  const myVote = db.prepare(
    'SELECT score, revote_count FROM votes WHERE voter_id = ? AND session_id = ?'
  ).get(userId, active.id) as any;

  return NextResponse.json({
    votingEnabled: Boolean(user.voting_enabled),
    progress: { rated: ratedContestants, total: totalContestants },
    myRecap,
    session: {
      id: active.id,
      contestantId: active.contestant_id,
      contestantName: active.contestant_name,
      openedAt: active.opened_at,
      voteCount: active.vote_count,
      isContestant: active.contestant_id === userId,
      alreadyVoted: Boolean(myVote),
      myScore: myVote?.score ?? null,
      revotesLeft: user.revotes_remaining,
    },
  });
}