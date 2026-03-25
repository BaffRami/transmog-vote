import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();

    const results = db.prepare(`
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
    `).all();

    const activeSessionCount = (db.prepare(
      'SELECT COUNT(*) AS count FROM voting_sessions WHERE is_active = 1'
    ).get() as any).count;

    return NextResponse.json({ results, activeSessionCount });
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
