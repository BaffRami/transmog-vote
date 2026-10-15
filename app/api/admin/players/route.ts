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
  
  // Changed .prepare().all() to await db.execute()
  const db = getDb();
  const result = await db.execute(
    'SELECT id, char_name, code, voting_enabled, reset_requested, created_at FROM users ORDER BY created_at'
  );
  const players = result.rows;

  return NextResponse.json({ players });
}

export async function PATCH(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id, votingEnabled, newPassword } = await req.json();
  const db = getDb();

  if (typeof votingEnabled !== 'undefined') {
    // Changed .prepare().run() to await db.execute()
    await db.execute({
      sql: 'UPDATE users SET voting_enabled = ? WHERE id = ?',
      args: [votingEnabled ? 1 : 0, id]
    });
  }

  if (newPassword) {
    if (newPassword.length < 4)
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
    const hash = await bcrypt.hash(newPassword, 10);
    
    // Changed .prepare().run() to await db.execute()
    await db.execute({
      sql: 'UPDATE users SET password_hash = ?, reset_requested = 0 WHERE id = ?',
      args: [hash, id]
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await req.json();
  const db = getDb();

  // Changed .prepare().all() to await db.execute() to fetch sessions asynchronously
  const result = await db.execute({
    sql: 'SELECT id FROM voting_sessions WHERE contestant_id = ?',
    args: [id]
  });
  const sessions = result.rows;
  
  // Rewritten to properly await deletes in the loop
  for (const s of sessions) {
    await db.execute({
      sql: 'DELETE FROM votes WHERE session_id = ?',
      args: [Number(s.id)]
    });
  }
  
  // Awaited all sequential deletions to respect foreign key constraints
  await db.execute({ sql: 'DELETE FROM voting_sessions WHERE contestant_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM votes WHERE voter_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] });

  return NextResponse.json({ ok: true });
}
