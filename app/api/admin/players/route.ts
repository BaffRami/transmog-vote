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
  try {
    const result = await getDb().execute(
      'SELECT id, char_name, code, voting_enabled, reset_requested, created_at FROM users ORDER BY created_at'
    );
    return NextResponse.json({ players: result.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { id, votingEnabled, newPassword } = await req.json();
    const db = getDb();

    if (typeof votingEnabled !== 'undefined') {
      await db.execute({
        sql: 'UPDATE users SET voting_enabled = ? WHERE id = ?',
        args: [votingEnabled ? 1 : 0, id],
      });
    }

    if (newPassword) {
      if (newPassword.length < 4)
        return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
      const hash = await bcrypt.hash(newPassword, 10);
      await db.execute({
        sql: 'UPDATE users SET password_hash = ?, reset_requested = 0 WHERE id = ?',
        args: [hash, id],
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { id } = await req.json();
    // All deletes run together as one transaction, in foreign-key order
    await getDb().batch([
      { sql: 'DELETE FROM votes WHERE session_id IN (SELECT id FROM voting_sessions WHERE contestant_id = ?)', args: [id] },
      { sql: 'DELETE FROM voting_sessions WHERE contestant_id = ?', args: [id] },
      { sql: 'DELETE FROM votes WHERE voter_id = ?', args: [id] },
      { sql: 'DELETE FROM users WHERE id = ?', args: [id] },
    ], 'write');
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { action } = await req.json();
    const db = getDb();

    if (action === 'reset') {
      await db.batch([
        'DELETE FROM votes',
        'DELETE FROM voting_sessions',
        'UPDATE users SET voting_enabled = 0',
      ], 'write');
      return NextResponse.json({ ok: true });
    }

    if (action === 'disapprove_all') {
      await db.execute('UPDATE users SET voting_enabled = 0');
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}