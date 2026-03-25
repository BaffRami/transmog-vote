import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session || !session.isAdmin)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  const results = db.prepare(`
    SELECT u.char_name,
      COUNT(v.id) as vote_count,
      ROUND(AVG(v.score), 2) as avg_score,
      MAX(v.score) as max_score,
      MIN(v.score) as min_score,
      vs.is_open
    FROM voting_sessions vs
    JOIN users u ON u.id = vs.contestant_id
    LEFT JOIN votes v ON v.session_id = vs.id
    GROUP BY vs.id
    ORDER BY avg_score DESC NULLS LAST, vote_count DESC
  `).all();
  return NextResponse.json({ results });
}