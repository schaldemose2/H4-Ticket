import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const db = await getDb();
    const [rows] = await db.query('SELECT * FROM passwords WHERE ticket_id = ? ORDER BY created_at DESC', [id]);
    
    const passwords = (rows as any[]).map(row => {
      try {
        const decrypted = decrypt(row.encrypted_password, row.iv);
        return {
          id: row.id,
          title: row.title,
          username: row.username,
          password: decrypted,
          created_at: row.created_at,
        };
      } catch (e) {
        return {
          id: row.id,
          title: row.title,
          username: row.username,
          password: '*** DECRYPTION FAILED ***',
          created_at: row.created_at,
        };
      }
    });

    return NextResponse.json(passwords);
  } catch (error: any) {
    console.error('Error fetching passwords:', error);
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
    const { title, username, password } = await request.json();
    if (!title || !username || !password) {
      return NextResponse.json({ error: 'Title, username, and password are required' }, { status: 400 });
    }

    const { iv, encryptedData } = encrypt(password);
    const db = await getDb();
    const passwordId = uuidv4();

    await db.query(
      'INSERT INTO passwords (id, ticket_id, title, username, encrypted_password, iv) VALUES (?, ?, ?, ?, ?, ?)',
      [passwordId, id, title, username, encryptedData, iv]
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding password:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
