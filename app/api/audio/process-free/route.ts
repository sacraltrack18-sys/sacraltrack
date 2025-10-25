import { NextRequest, NextResponse } from 'next/server';
import { database, ID } from '@/libs/AppWriteClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audioId, imageId, trackname, genre, userId } = body;

    // Validate required fields
    if (!audioId || !imageId || !trackname || !genre || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    console.log('Processing free content:', { audioId, imageId, trackname, genre, userId });

    // Create post directly in database - marking as free content
    const postId = ID.unique();
    
    try {
      const postData = {
        id: postId,
        user_id: userId,
        trackname: trackname,
        genre: genre,
        audio_url: audioId, // Use the uploaded file ID
        image_url: imageId, // Use the uploaded image ID
        mp3_url: audioId, // Same as audio_url for free content
        is_free: true, // Mark as free content
        created_at: new Date().toISOString()
      };

      console.log('Creating free post with data:', postData);

      const post = await database.createDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_POSTS!,
        postId,
        postData
      );

      console.log('Free post created successfully:', post.$id);

      return NextResponse.json({
        success: true,
        trackId: post.$id,
        message: 'Free content uploaded successfully'
      });

    } catch (dbError) {
      console.error('Database error creating free post:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create free post in database'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in process-free API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
