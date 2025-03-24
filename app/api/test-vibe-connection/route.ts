import { NextResponse } from 'next/server';
import { Client, Databases } from 'node-appwrite';

const maskValue = (value: string | undefined) => {
  if (!value) return null;
  if (value.length <= 8) return '********';
  return value.substring(0, 4) + '****' + value.substring(value.length - 4);
};

export async function GET() {
  try {
    // Информация о среде
    const envInfo = {
      appwriteUrl: process.env.NEXT_PUBLIC_APPWRITE_URL,
      endpoint: process.env.NEXT_PUBLIC_ENDPOINT,
      databaseId: process.env.NEXT_PUBLIC_DATABASE_ID,
      bucketId: process.env.NEXT_PUBLIC_BUCKET_ID,
      
      // Коллекции VIBE (только ID, без секретных данных)
      vibePostsCollection: process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS,
      vibeLikesCollection: process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_LIKES,
      vibeCommentsCollection: process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_COMMENTS,
      vibeViewsCollection: process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_VIEWS,
    };
    
    // Инициализируем клиент Appwrite
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL!)
      .setProject(process.env.NEXT_PUBLIC_ENDPOINT!)
      .setKey(process.env.APPWRITE_API_KEY!);
    
    const databases = new Databases(client);
    
    // Проверяем соединение, пробуя получить список документов из каждой коллекции
    const collectionsStatus = {
      database_connection: "Checking...",
      vibe_posts: "Checking...",
      vibe_likes: "Checking...",
      vibe_comments: "Checking...",
      vibe_views: "Checking...",
    };
    
    // Проверяем базу данных
    try {
      await databases.list();
      collectionsStatus.database_connection = "Connected";
    } catch (error: any) {
      collectionsStatus.database_connection = `Error: ${error.message}`;
    }
    
    // Проверяем коллекцию vibe_posts
    try {
      await databases.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
        []
      );
      collectionsStatus.vibe_posts = "Connected";
    } catch (error: any) {
      collectionsStatus.vibe_posts = `Error: ${error.message}`;
    }
    
    // Проверяем коллекцию vibe_likes
    try {
      await databases.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_LIKES!,
        []
      );
      collectionsStatus.vibe_likes = "Connected";
    } catch (error: any) {
      collectionsStatus.vibe_likes = `Error: ${error.message}`;
    }
    
    // Проверяем коллекцию vibe_comments
    try {
      await databases.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_COMMENTS!,
        []
      );
      collectionsStatus.vibe_comments = "Connected";
    } catch (error: any) {
      collectionsStatus.vibe_comments = `Error: ${error.message}`;
    }
    
    // Проверяем коллекцию vibe_views
    try {
      await databases.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_VIEWS!,
        []
      );
      collectionsStatus.vibe_views = "Connected";
    } catch (error: any) {
      collectionsStatus.vibe_views = `Error: ${error.message}`;
    }
    
    // Собираем информацию и возвращаем ответ
    return NextResponse.json({
      status: "success",
      timestamp: new Date().toISOString(),
      environment: envInfo,
      connectionStatus: collectionsStatus,
      message: "Проверка соединения с Appwrite и доступа к VIBE коллекциям"
    });
    
  } catch (error: any) {
    console.error('Error testing VIBE connection:', error);
    
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to test VIBE connection",
        error: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
} 