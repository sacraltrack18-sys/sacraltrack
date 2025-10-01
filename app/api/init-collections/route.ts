import { NextResponse } from 'next/server';
import { Client, Databases } from 'node-appwrite';

export async function GET() {
  try {
    // Initialize the Appwrite client
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL!)
      .setProject(process.env.NEXT_PUBLIC_ENDPOINT!)
      .setKey(process.env.APPWRITE_API_KEY!); // Make sure to add this to your environment variables

    const databases = new Databases(client);

    // Create payment_cards collection if it doesn't exist
    try {
      await databases.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'payment_cards'
      );
      return NextResponse.json({ message: 'Collections already exist' });
    } catch (error) {
      // If collection doesn't exist, create it
      await databases.createCollection(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'payment_cards',
        'Payment Cards'
      );

      // Create attributes for the collection
      await databases.createStringAttribute(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'payment_cards',
        'user_id',
        255,
        true
      );

      await databases.createDatetimeAttribute(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'payment_cards',
        'date',
        true
      );

      await databases.createStringAttribute(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'payment_cards',
        'card',
        255,
        true
      );

      await databases.createStringAttribute(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'payment_cards',
        'card_name',
        255,
        true
      );

      await databases.createStringAttribute(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'payment_cards',
        'card_date',
        255,
        true
      );

      await databases.createStringAttribute(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'payment_cards',
        'amount',
        255,
        true
      );

      await databases.createStringAttribute(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'payment_cards',
        'paid',
        255,
        true
      );

      await databases.createStringAttribute(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'payment_cards',
        'author_id',
        255,
        true
      );

      await databases.createStringAttribute(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'payment_cards',
        'status',
        255,
        true
      );

      await databases.createDatetimeAttribute(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'payment_cards',
        'withdrawal_date',
        true
      );

      await databases.createStringAttribute(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'payment_cards',
        'withdrawal_method',
        255,
        true
      );

      await databases.createStringAttribute(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'payment_cards',
        'transaction_id',
        255,
        true
      );

      await databases.createStringAttribute(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'payment_cards',
        'currency',
        255,
        true
      );

      return NextResponse.json({ message: 'Collections initialized successfully' });
    }

    // Create friends collection if it doesn't exist
    try {
      await databases.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'friends'
      );
    } catch (error) {
      // If collection doesn't exist, create it
      await databases.createCollection(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'friends',
        'Friends'
      );

      // Create attributes for the collection
      await databases.createStringAttribute(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'friends',
        'user_id',
        255,
        true
      );

      await databases.createStringAttribute(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'friends',
        'friend_id',
        255,
        true
      );

      await databases.createStringAttribute(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'friends',
        'status',
        255,
        true
      );

      await databases.createDatetimeAttribute(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'friends',
        'created_at',
        true
      );
    }
  } catch (error) {
    console.error('Failed to initialize collections:', error);
    return NextResponse.json(
      { error: 'Failed to initialize collections' },
      { status: 500 }
    );
  }
} 