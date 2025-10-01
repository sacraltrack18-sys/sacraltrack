import { NextResponse } from 'next/server';
import { database, ID, Query } from '@/libs/AppWriteClient';
import { generateTOTP } from '@/app/utils/auth';
import { sendSMS } from '@/app/utils/notifications';

export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    // Get manager
    const managers = await database.listDocuments(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      process.env.NEXT_PUBLIC_COLLECTION_ID_MANAGERS!,
      [Query.equal('username', username)]
    );

    if (managers.documents.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'Manager not found' }),
        { status: 404 }
      );
    }

    const manager = managers.documents[0];

    // Generate 6-digit TOTP code
    const code = generateTOTP();

    // Store code in database with 5-minute expiration
    await database.createDocument(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      process.env.NEXT_PUBLIC_COLLECTION_ID_2FA_CODES!,
      ID.unique(),
      {
        manager_id: manager.$id,
        code: code,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        used: false
      }
    );

    // Send code via SMS
    await sendSMS(
      manager.phone_number,
      `Your authentication code is: ${code}. Valid for 5 minutes.`
    );

    // Log 2FA attempt
    await database.createDocument(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      process.env.NEXT_PUBLIC_COLLECTION_ID_MANAGER_LOGS!,
      ID.unique(),
      {
        manager_id: manager.$id,
        action: '2fa_code_sent',
        status: 'success',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        timestamp: new Date().toISOString()
      }
    );

    return new NextResponse(
      JSON.stringify({ success: true }),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error sending 2FA code:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to send 2FA code' }),
      { status: 500 }
    );
  }
} 