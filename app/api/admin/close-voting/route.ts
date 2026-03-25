import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST() {
  if (!isAdminAuthenticated()) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    getDb().prepare(
      'UPDATE voting_sessions SET is_active = 0, closed_at = CURRENT_TIMESTAMP WHERE is_active = 1'
    ).run();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
