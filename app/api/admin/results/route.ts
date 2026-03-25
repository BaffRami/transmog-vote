import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const db = getDb();
  const votes = db.prepare(`
    SELECT u.char_name as voter_name, v.score, v.voted_at
    FROM votes v
    JOIN users u ON u.id = v.voter_id
    WHERE v.session_id = ?
    ORDER BY v.score DESC
  `).all(Number(sessionId));

  return NextResponse.json({ votes });
}