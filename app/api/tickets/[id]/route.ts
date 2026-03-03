import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const db = await getDb();
    const [rows] = await db.query(`
      SELECT t.*, 
        GROUP_CONCAT(c.id) as category_ids,
        GROUP_CONCAT(c.name) as categories,
        GROUP_CONCAT(c.color) as category_colors
      FROM tickets t
      LEFT JOIN ticket_categories tc ON t.id = tc.ticket_id
      LEFT JOIN categories c ON tc.category_id = c.id
      WHERE t.id = ?
      GROUP BY t.id
    `, [id]);
    const ticket = (rows as any)[0];

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error: any) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { status, assigned_to, categories } = await request.json();
    const db = await getDb();

    if (status) {
      await db.query('UPDATE tickets SET status = ? WHERE id = ?', [status, id]);
    }

    if (assigned_to !== undefined) {
      await db.query('UPDATE tickets SET assigned_to = ? WHERE id = ?', [assigned_to, id]);
    }

    if (categories && Array.isArray(categories)) {
      await db.query('DELETE FROM ticket_categories WHERE ticket_id = ?', [id]);
      for (const catId of categories) {
        await db.query('INSERT INTO ticket_categories (ticket_id, category_id) VALUES (?, ?)', [id, catId]);
      }
    }

    const [rows] = await db.query(`
      SELECT t.*, 
        GROUP_CONCAT(c.id) as category_ids,
        GROUP_CONCAT(c.name) as categories,
        GROUP_CONCAT(c.color) as category_colors
      FROM tickets t
      LEFT JOIN ticket_categories tc ON t.id = tc.ticket_id
      LEFT JOIN categories c ON tc.category_id = c.id
      WHERE t.id = ?
      GROUP BY t.id
    `, [id]);
    
    const updatedTicket = (rows as any)[0];
    
    if (status && updatedTicket.assigned_to) {
      await sendNotification(updatedTicket.assigned_to, id, 'UPDATE', `Ticket #${id.substring(0, 8)} status updated to ${status}`);
    }
    if (status && updatedTicket.created_by && updatedTicket.created_by !== updatedTicket.assigned_to) {
      await sendNotification(updatedTicket.created_by, id, 'UPDATE', `Your ticket #${id.substring(0, 8)} status updated to ${status}`);
    }
    if (assigned_to && assigned_to !== updatedTicket.created_by) {
      await sendNotification(assigned_to, id, 'UPDATE', `You have been assigned to ticket #${id.substring(0, 8)}`);
    }

    return NextResponse.json(updatedTicket);
  } catch (error: any) {
    console.error('Error updating ticket:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
