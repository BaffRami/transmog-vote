import { NextResponse } from 'next/server';
import { getDb, CLASS_COLORS } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const session = db.prepare(`
      SELECT vs.id AS session_id, vs.player_id,
             p.name, p.wow_class
      FROM voting_sessions vs
      JOIN players p ON p.id = vs.player_id
      WHERE vs.is_active = 1
      ORDER BY vs.opened_at DESC
      LIMIT 1
    `).get() as any;

    if (!session) return NextResponse.json({ session: null });

    const voteCount = (db.prepare(
      'SELECT COUNT(*) AS count FROM votes WHERE session_id = ?'
    ).get(session.session_id) as any).count;

    return NextResponse.json({
      session: {
        sessionId:  session.session_id,
        player:     { id: session.player_id, name: session.name, wow_class: session.wow_class },
        voteCount,
        classColor: (CLASS_COLORS as any)[session.wow_class] || '#c8a96e',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
