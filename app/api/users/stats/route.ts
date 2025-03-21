import { NextResponse } from 'next/server';
import { database, ID, Query } from '@/libs/AppWriteClient';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get total tracks
    const tracks = await database.listDocuments(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      process.env.NEXT_PUBLIC_COLLECTION_ID_POSTS!,
      [
        Query.equal('user_id', userId)
      ]
    );
    const totalTracks = tracks.documents.length;

    // Get total likes received
    const likes = await database.listDocuments(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      process.env.NEXT_PUBLIC_COLLECTION_ID_LIKES!,
      [
        Query.equal('post.user_id', userId)
      ]
    );
    const totalLikes = likes.documents.length;

    // Get total sales
    const sales = await database.listDocuments(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      process.env.NEXT_PUBLIC_COLLECTION_ID_PURCHASES!,
      [
        Query.equal('author_id', userId)
      ]
    );
    const totalSales = sales.documents.length;

    // Calculate rating based on likes and sales
    const rating = totalTracks > 0
      ? Math.min(5, (totalLikes * 0.7 + totalSales * 0.3) / totalTracks)
      : 0;

    return NextResponse.json({
      stats: {
        totalTracks,
        totalLikes,
        totalSales,
        rating: Number(rating.toFixed(1))
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json({ error: 'Failed to fetch user stats' }, { status: 500 });
  }
} 