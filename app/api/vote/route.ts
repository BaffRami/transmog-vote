import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, voterName, score } = await req.json();

    if (!sessionId || !voterName?.trim() || !score) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    if (!Number.isInteger(score) || score < 1 || score > 10) {
      return NextResponse.json({ error: 'Score must be 1–10.' }, { status: 400 });
    }

    const db = getDb();

    const session = db.prepare(`
      SELECT vs.id, p.name AS player_name
      FROM voting_sessions vs
      JOIN players p ON p.id = vs.player_id
      WHERE vs.id = ? AND vs.is_active = 1
    `).get(sessionId) as any;

    if (!session) {
      return NextResponse.json({ error: 'Voting session is not active.' }, { status: 400 });
    }

    if (voterName.trim().toLowerCase() === session.player_name.toLowerCase()) {
      return NextResponse.json({ error: "You can\'t vote for yourself!" }, { status: 400 });
    }

    try {
      db.prepare('INSERT INTO votes (session_id, voter_name, score) VALUES (?, ?, ?)').run(
        sessionId, voterName.trim(), score
      );
      return NextResponse.json({ success: true });
    } catch (e: any) {
      if (e?.message?.includes('UNIQUE constraint')) {
        return NextResponse.json({ error: 'You already voted for this player!' }, { status: 400 });
      }
      throw e;
    }
  } catch (e: any) {
    if (e?.message?.includes('already voted') || e?.message?.includes('not active')) throw e;
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
