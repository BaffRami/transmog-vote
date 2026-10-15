import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const res = await db.execute(`
      SELECT u.char_name,
        COUNT(v.id)            AS vote_count,
        ROUND(AVG(v.score), 2) AS avg_score,
        MAX(v.score)           AS max_score,
        MIN(v.score)           AS min_score,
        vs.is_open
      FROM voting_sessions vs
      JOIN users u ON u.id = vs.contestant_id
      LEFT JOIN votes v ON v.session_id = vs.id
      GROUP BY vs.id
      ORDER BY avg_score DESC NULLS LAST, vote_count DESC
    `);

    const results = res.rows.map((r: any) => ({
      char_name: r.char_name,
      vote_count: Number(r.vote_count),
      avg_score: r.avg_score == null ? null : Number(r.avg_score),
      max_score: r.max_score == null ? null : Number(r.max_score),
      min_score: r.min_score == null ? null : Number(r.min_score),
      is_open: Number(r.is_open),
    }));

    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}