import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { sendNotification } from '@/lib/notifications';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';

  try {
    const db = await getDb();
    
    let query = `
      SELECT t.*, 
        GROUP_CONCAT(c.name) as categories,
        GROUP_CONCAT(c.color) as category_colors
      FROM tickets t
      LEFT JOIN ticket_categories tc ON t.id = tc.ticket_id
      LEFT JOIN categories c ON tc.category_id = c.id
    `;
    
    const queryParams: any[] = [];

    if (search) {
      query += ` WHERE t.title LIKE ? OR t.description LIKE ? OR t.id LIKE ? OR t.status LIKE ? OR t.assigned_to LIKE ? OR c.name LIKE ?`;
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    query += ` GROUP BY t.id ORDER BY t.created_at DESC`;

    const [rows] = await db.query(query, queryParams);
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, description, categories } = await request.json();
    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const db = await getDb();
    const id = uuidv4();
    const userId = (session.user as any)?.email || session.user?.name || 'unknown';

    await db.query(
      'INSERT INTO tickets (id, title, description, status, created_by) VALUES (?, ?, ?, ?, ?)',
      [id, title, description, 'OPEN', userId]
    );

    if (categories && Array.isArray(categories) && categories.length > 0) {
      for (const catId of categories) {
        await db.query('INSERT INTO ticket_categories (ticket_id, category_id) VALUES (?, ?)', [id, catId]);
      }
    }

    // Notify users who want to be notified on ticket creation
    // In a real app, you might query for all users with on_create=true
    // For this example, we'll just log it or notify a specific admin if we had one.
    // Let's query users who have on_create = true
    const [settingRows] = await db.query('SELECT user_id FROM notification_settings WHERE on_create = TRUE AND user_id != ?', [userId]);
    const usersToNotify = settingRows as any[];
    for (const u of usersToNotify) {
      await sendNotification(u.user_id, id, 'CREATE', `New ticket created: ${title}`);
    }

    const [rows] = await db.query('SELECT * FROM tickets WHERE id = ?', [id]);
    return NextResponse.json((rows as any)[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating ticket:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
