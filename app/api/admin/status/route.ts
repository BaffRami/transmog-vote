import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getDb, CLASS_COLORS } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isAdminAuthenticated()) return NextResponse.json({ authenticated: false });

  try {
    const db = getDb();

    const players = db.prepare('SELECT * FROM players ORDER BY name COLLATE NOCASE').all();

    const activeSession = db.prepare(`
      SELECT vs.id, vs.player_id, vs.opened_at,
             p.name, p.wow_class,
             COUNT(v.id) AS vote_count
      FROM voting_sessions vs
      JOIN players p  ON p.id  = vs.player_id
      LEFT JOIN votes v ON v.session_id = vs.id
      WHERE vs.is_active = 1
      GROUP BY vs.id
      LIMIT 1
    `).get() as any;

    const votedPlayerIds = (db.prepare(
      'SELECT DISTINCT player_id FROM voting_sessions WHERE is_active = 0'
    ).all() as any[]).map(r => r.player_id);

    return NextResponse.json({
      authenticated: true,
      players,
      activeSession: activeSession
        ? { ...activeSession, classColor: (CLASS_COLORS as any)[activeSession.wow_class] || '#c8a96e' }
        : null,
      votedPlayerIds,
    });
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
