import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { sendNotification } from '@/lib/notifications';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const db = await getDb();
    const [rows] = await db.query('SELECT * FROM comments WHERE ticket_id = ? ORDER BY created_at ASC', [id]);
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { content } = await request.json();
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const db = await getDb();
    const commentId = uuidv4();
    const userId = (session.user as any)?.email || session.user?.name || 'unknown';
    const userName = session.user?.name || 'Unknown User';

    await db.query(
      'INSERT INTO comments (id, ticket_id, user_id, user_name, content) VALUES (?, ?, ?, ?, ?)',
      [commentId, id, userId, userName, content]
    );

    const [ticketRows] = await db.query('SELECT * FROM tickets WHERE id = ?', [id]);
    const ticket = (ticketRows as any)[0];
    
    if (ticket) {
      if (ticket.assigned_to && ticket.assigned_to !== userId) {
        await sendNotification(ticket.assigned_to, id, 'COMMENT', `New comment on ticket #${id.substring(0, 8)} by ${userName}`);
      }
      if (ticket.created_by && ticket.created_by !== userId && ticket.created_by !== ticket.assigned_to) {
        await sendNotification(ticket.created_by, id, 'COMMENT', `New comment on your ticket #${id.substring(0, 8)} by ${userName}`);
      }
    }

    const [rows] = await db.query('SELECT * FROM comments WHERE id = ?', [commentId]);
    return NextResponse.json((rows as any)[0], { status: 201 });
  } catch (error: any) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
