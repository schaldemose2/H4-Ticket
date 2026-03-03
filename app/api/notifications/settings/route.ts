import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any)?.email || session.user?.name || 'unknown';

  try {
    const db = await getDb();
    const [rows] = await db.query('SELECT * FROM notification_settings WHERE user_id = ?', [userId]);
    
    let settings = (rows as any)[0];
    if (!settings) {
      settings = { user_id: userId, on_create: true, on_update: true, on_comment: true };
      await db.query(
        'INSERT INTO notification_settings (user_id, on_create, on_update, on_comment) VALUES (?, ?, ?, ?)',
        [userId, true, true, true]
      );
    }
    
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Error fetching notification settings:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any)?.email || session.user?.name || 'unknown';

  try {
    const { on_create, on_update, on_comment } = await request.json();
    const db = await getDb();
    
    await db.query(`
      INSERT INTO notification_settings (user_id, on_create, on_update, on_comment) 
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE on_create = ?, on_update = ?, on_comment = ?
    `, [userId, on_create, on_update, on_comment, on_create, on_update, on_comment]);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating notification settings:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
