import { NextResponse } from 'next/server';
import { databases } from '@/libs/AppWriteClient';
import { ID } from 'appwrite';

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const { trackname, genre, artist, imageId, wavId, processing_status } = data;

        if (!trackname || !genre || !imageId || !wavId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Getting the database and collection IDs from environment variables
        const databaseId = process.env.APPWRITE_DATABASE_ID;
        const collectionId = process.env.APPWRITE_COLLECTION_ID_POST;

        if (!databaseId || !collectionId) {
            return NextResponse.json(
                { error: 'Database or collection not configured' },
                { status: 500 }
            );
        }

        try {
            console.log('Creating post document...', {
                trackname,
                genre,
                timestamp: new Date().toISOString()
            });

            // Create post document
            const postId = ID.unique();
            const post = await databases.createDocument(
                databaseId,
                collectionId,
                postId,
                {
                    trackname,
                    genre,
                    artist: artist || 'Unknown Artist',
                    image_id: imageId,
                    wav_id: wavId,
                    processing_status: processing_status || 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            );

            console.log('Post created successfully', {
                postId: post.$id,
                timestamp: new Date().toISOString()
            });

            return NextResponse.json({
                success: true,
                postId: post.$id
            });

        } catch (dbError) {
            console.error('Error creating post document:', dbError);
            return NextResponse.json(
                { error: 'Failed to create post' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Error in post creation API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 