import { getDb } from './db';
import { v4 as uuidv4 } from 'uuid';

export async function sendNotification(
  userId: string,
  ticketId: string,
  type: 'CREATE' | 'UPDATE' | 'COMMENT',
  message: string
) {
  if (!userId) return;

  try {
    const db = await getDb();
    
    // Check settings
    const [settingsRows] = await db.query('SELECT * FROM notification_settings WHERE user_id = ?', [userId]);
    const settings = (settingsRows as any)[0] || { on_create: true, on_update: true, on_comment: true };
    
    let shouldSend = false;
    if (type === 'CREATE' && settings.on_create) shouldSend = true;
    if (type === 'UPDATE' && settings.on_update) shouldSend = true;
    if (type === 'COMMENT' && settings.on_comment) shouldSend = true;

    if (shouldSend) {
      const id = uuidv4();
      await db.query(
        'INSERT INTO notifications (id, user_id, ticket_id, type, message) VALUES (?, ?, ?, ?, ?)',
        [id, userId, ticketId, type, message]
      );
    }
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}
