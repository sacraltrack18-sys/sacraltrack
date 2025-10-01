import { NextResponse } from 'next/server';
import { database, ID, Query } from '@/libs/AppWriteClient';

// Get friends list
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get friend requests for this user (either as sender or receiver)
    const requests = await database.listDocuments(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      process.env.NEXT_PUBLIC_COLLECTION_ID_FRIEND_REQUESTS!,
      [
        Query.equal('user_id', userId),
        Query.equal('friend_id', userId)
      ]
    );

    // For each friend request, we need to fetch profile data
    const friendRequestsWithProfiles = await Promise.all(
      requests.documents.map(async (request) => {
        const friendId = request.user_id === userId ? request.friend_id : request.user_id;
        
        // Get friend profile
        const profileResponse = await database.getDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
          friendId
        );
        
        return {
          ...request,
          profiles: {
            name: profileResponse.name,
            image: profileResponse.image
          }
        };
      })
    );

    return NextResponse.json({ data: friendRequestsWithProfiles });
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    return NextResponse.json({ error: 'Failed to fetch friend requests' }, { status: 500 });
  }
}

// Send friend request
export async function POST(req: Request) {
  try {
    const { userId, friendId } = await req.json();
    
    if (!userId || !friendId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if request already exists
    const existingRequestsAsSender = await database.listDocuments(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      process.env.NEXT_PUBLIC_COLLECTION_ID_FRIEND_REQUESTS!,
      [
        Query.equal('user_id', userId),
        Query.equal('friend_id', friendId)
      ]
    );
    
    const existingRequestsAsReceiver = await database.listDocuments(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      process.env.NEXT_PUBLIC_COLLECTION_ID_FRIEND_REQUESTS!,
      [
        Query.equal('user_id', friendId),
        Query.equal('friend_id', userId)
      ]
    );

    if (existingRequestsAsSender.documents.length > 0 || existingRequestsAsReceiver.documents.length > 0) {
      return NextResponse.json({ error: 'Friend request already exists' }, { status: 400 });
    }

    // Create new friend request
    const data = await database.createDocument(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      process.env.NEXT_PUBLIC_COLLECTION_ID_FRIEND_REQUESTS!,
      ID.unique(),
      {
        user_id: userId,
        friend_id: friendId,
        status: 'pending',
        created_at: new Date().toISOString()
      }
    );

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error sending friend request:', error);
    return NextResponse.json({ error: 'Failed to send friend request' }, { status: 500 });
  }
}

// Update friend request status
export async function PATCH(req: Request) {
  try {
    const { requestId, status } = await req.json();
    
    if (!requestId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update friend request status
    const data = await database.updateDocument(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      process.env.NEXT_PUBLIC_COLLECTION_ID_FRIEND_REQUESTS!,
      requestId,
      { status }
    );

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating friend request:', error);
    return NextResponse.json({ error: 'Failed to update friend request' }, { status: 500 });
  }
}

// Delete friend or cancel request
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('requestId');
    
    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    // Delete friend request
    await database.deleteDocument(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      process.env.NEXT_PUBLIC_COLLECTION_ID_FRIEND_REQUESTS!,
      requestId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting friend request:', error);
    return NextResponse.json({ error: 'Failed to delete friend request' }, { status: 500 });
  }
} 