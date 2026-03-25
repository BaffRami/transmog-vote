import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

async function isAdmin() {
  const s = await getSession();
  return s?.isAdmin === true;
}

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const players = getDb().prepare(
    'SELECT id, char_name, code, voting_enabled, reset_requested, created_at FROM users ORDER BY created_at'
  ).all();
  return NextResponse.json({ players });
}

export async function PATCH(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id, votingEnabled, newPassword } = await req.json();
  const db = getDb();

  if (typeof votingEnabled !== 'undefined') {
    db.prepare('UPDATE users SET voting_enabled = ? WHERE id = ?').run(votingEnabled ? 1 : 0, id);
  }

  if (newPassword) {
    if (newPassword.length < 4)
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
    const hash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, reset_requested = 0 WHERE id = ?').run(hash, id);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await req.json();
  const db = getDb();

  // Delete in order to respect foreign key constraints
  const sessions = db.prepare('SELECT id FROM voting_sessions WHERE contestant_id = ?').all(id) as any[];
  for (const s of sessions) {
    db.prepare('DELETE FROM votes WHERE session_id = ?').run(s.id);
  }
  db.prepare('DELETE FROM voting_sessions WHERE contestant_id = ?').run(id);
  db.prepare('DELETE FROM votes WHERE voter_id = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);

  return NextResponse.json({ ok: true });
}