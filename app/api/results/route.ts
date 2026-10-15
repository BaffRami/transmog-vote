import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();

    // 1. Fetch leaderboard statistics via await
    const queryResult = await db.execute(`
      SELECT
        p.id   AS player_id,
        p.name,
        p.wow_class,
        ROUND(AVG(v.score), 2) AS avg_score,
        COUNT(v.id)            AS vote_count
      FROM players p
      JOIN voting_sessions vs ON vs.player_id = p.id
      JOIN votes v            ON v.session_id  = vs.id
      WHERE vs.is_active = 0
      GROUP BY p.id
      ORDER BY avg_score DESC
    `);
    const results = queryResult.rows;

    // 2. Fetch the active session count row safely
    const sessionCheck = await db.execute(
      'SELECT COUNT(*) AS count FROM voting_sessions WHERE is_active = 1'
    );
    const activeSessionCount = Number((sessionCheck.rows as any)?.count || 0);

    return NextResponse.json({ results, activeSessionCount });
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
