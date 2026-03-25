import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated()) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const { playerId } = await req.json();
    if (!playerId) return NextResponse.json({ error: 'playerId required.' }, { status: 400 });

    const db = getDb();
    // Close any open sessions first
    db.prepare(
      'UPDATE voting_sessions SET is_active = 0, closed_at = CURRENT_TIMESTAMP WHERE is_active = 1'
    ).run();
    // Open new session
    const r = db.prepare('INSERT INTO voting_sessions (player_id) VALUES (?)').run(playerId);
    return NextResponse.json({ success: true, sessionId: r.lastInsertRowid });
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
