import { NextResponse } from "next/server";
import { database, Query } from "@/libs/AppWriteClient";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Check if purchase with this session_id already exists
    const existingPurchases = await database.listDocuments(
      String(process.env.NEXT_PUBLIC_DATABASE_ID),
      String(process.env.NEXT_PUBLIC_COLLECTION_ID_PURCHASES),
      [
        Query.equal('session_id', sessionId)
      ]
    );

    return NextResponse.json({
      exists: existingPurchases.documents.length > 0,
      purchases: existingPurchases.documents.length > 0 ? existingPurchases.documents : null
    });
  } catch (error) {
    console.error('Error checking for existing purchase:', error);
    return NextResponse.json(
      { error: 'Failed to check for existing purchase' },
      { status: 500 }
    );
  }
} 