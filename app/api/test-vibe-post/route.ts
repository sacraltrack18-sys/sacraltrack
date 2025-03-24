import { NextResponse } from 'next/server';
import { Client, Databases, ID } from 'node-appwrite';

export async function POST(req: Request) {
  try {
    // Получаем данные из запроса
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }
    
    // Инициализируем Appwrite клиент
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL!)
      .setProject(process.env.NEXT_PUBLIC_ENDPOINT!)
      .setKey(process.env.APPWRITE_API_KEY!);
    
    const databases = new Databases(client);
    
    // Логируем значения переменных
    console.log('NEXT_PUBLIC_DATABASE_ID:', process.env.NEXT_PUBLIC_DATABASE_ID);
    console.log('NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS:', process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS);
    
    // Создаем тестовый VIBE пост с заглушкой для URL медиа
    const testVibeId = ID.unique();
    
    const vibePost = await databases.createDocument(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
      testVibeId,
      {
        user_id: userId,
        type: 'photo',
        media_url: 'https://placekitten.com/450/560', // Заглушка для медиа URL
        caption: 'Test vibe post created via API',
        mood: 'Happy',
        created_at: new Date().toISOString(),
        location: 'Test Location',
        tags: ['test', 'api'],
        stats: {
          total_likes: 0,
          total_comments: 0,
          total_views: 0
        }
      }
    );
    
    // Возвращаем созданный пост
    return NextResponse.json({
      status: 'success',
      vibePost: {
        id: vibePost.$id,
        user_id: vibePost.user_id,
        type: vibePost.type,
        media_url: vibePost.media_url,
        caption: vibePost.caption,
        created_at: vibePost.created_at
      }
    });
    
  } catch (error: any) {
    console.error('Error creating test vibe post:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to create test vibe post',
        error: error.message || 'Unknown error',
        details: {
          database_id: process.env.NEXT_PUBLIC_DATABASE_ID,
          collection_id: process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS
        }
      },
      { status: 500 }
    );
  }
} 