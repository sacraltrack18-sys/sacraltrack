import { NextResponse } from 'next/server';
import { Client, Databases, Query } from 'appwrite';

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const databases = new Databases(client);

export async function GET(
    request: Request,
    { params }: { params: { postId: string } }
) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '2');

        const comments = await databases.listDocuments(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            'comments', // Your comments collection ID
            [
                Query.equal('post_id', params.postId),
                Query.orderDesc('$createdAt'),
                Query.limit(limit)
            ]
        );

        // Transform the data to match the expected format
        const formattedComments = comments.documents.map(comment => ({
            id: comment.$id,
            text: comment.text,
            created_at: comment.$createdAt,
            user: {
                name: comment.user_name, // Adjust field names based on your schema
                image: comment.user_image
            }
        }));

        return NextResponse.json(formattedComments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }
} 