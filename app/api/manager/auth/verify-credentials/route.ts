import { NextResponse } from 'next/server';
import { database, ID, Query } from '@/libs/AppWriteClient';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { sign } from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // Get manager from database
    const managers = await database.listDocuments(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      process.env.NEXT_PUBLIC_COLLECTION_ID_MANAGERS!,
      [
        Query.equal('username', username),
        Query.equal('status', 'active')
      ]
    );

    if (managers.documents.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401 }
      );
    }

    const manager = managers.documents[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, manager.password);
    if (!isValidPassword) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401 }
      );
    }

    // Generate session token
    const token = sign(
      { 
        id: manager.$id,
        username: manager.username,
        role: 'manager'
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    // Set session cookie
    cookies().set('manager_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600 // 1 hour
    });

    // Log authentication attempt
    await database.createDocument(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      process.env.NEXT_PUBLIC_COLLECTION_ID_MANAGER_LOGS!,
      ID.unique(),
      {
        manager_id: manager.$id,
        action: 'login_attempt',
        status: 'success',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      }
    );

    return new NextResponse(
      JSON.stringify({ success: true }),
      { status: 200 }
    );

  } catch (error) {
    console.error('Manager authentication error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Authentication failed' }),
      { status: 500 }
    );
  }
} 