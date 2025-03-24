import { NextResponse } from 'next/server';
import { Client, Databases } from 'node-appwrite';

export async function GET() {
  try {
    // Собираем информацию о переменных окружения
    const envInfo = {
      // Общие настройки
      appwriteUrl: process.env.NEXT_PUBLIC_APPWRITE_URL,
      endpoint: process.env.NEXT_PUBLIC_ENDPOINT,
      databaseId: process.env.NEXT_PUBLIC_DATABASE_ID,
      bucketId: process.env.NEXT_PUBLIC_BUCKET_ID,
      
      // Коллекции VIBE
      vibePostsCollection: process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS,
      vibeLikesCollection: process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_LIKES,
      vibeCommentsCollection: process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_COMMENTS,
      vibeViewsCollection: process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_VIEWS,
      
      // Другие ключевые коллекции
      postsCollection: process.env.NEXT_PUBLIC_COLLECTION_ID_POST,
      likesCollection: process.env.NEXT_PUBLIC_COLLECTION_ID_LIKE,
      commentsCollection: process.env.NEXT_PUBLIC_COLLECTION_ID_COMMENT,
      profileCollection: process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE
    };
    
    // Инициализируем Appwrite клиент для проверки доступа
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL!)
      .setProject(process.env.NEXT_PUBLIC_ENDPOINT!)
      .setKey(process.env.APPWRITE_API_KEY!);
    
    const databases = new Databases(client);
    
    // Проверяем существование коллекций
    const collectionsStatus = {
      vibe_posts: "Checking...",
      vibe_likes: "Checking...",
      vibe_comments: "Checking...",
      vibe_views: "Checking..."
    };
    
    try {
      // Пробуем получить документы из коллекции vibe_posts
      await databases.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
        []
      );
      collectionsStatus.vibe_posts = "Accessible";
    } catch (error: any) {
      collectionsStatus.vibe_posts = `Error: ${error.message}`;
    }
    
    try {
      // Пробуем получить документы из коллекции vibe_likes
      await databases.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_LIKES!,
        []
      );
      collectionsStatus.vibe_likes = "Accessible";
    } catch (error: any) {
      collectionsStatus.vibe_likes = `Error: ${error.message}`;
    }
    
    try {
      // Пробуем получить документы из коллекции vibe_comments
      await databases.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_COMMENTS!,
        []
      );
      collectionsStatus.vibe_comments = "Accessible";
    } catch (error: any) {
      collectionsStatus.vibe_comments = `Error: ${error.message}`;
    }
    
    try {
      // Пробуем получить документы из коллекции vibe_views
      await databases.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_VIEWS!,
        []
      );
      collectionsStatus.vibe_views = "Accessible";
    } catch (error: any) {
      collectionsStatus.vibe_views = `Error: ${error.message}`;
    }
    
    // Возвращаем собранную информацию
    return NextResponse.json({
      status: "success",
      environmentVariables: envInfo,
      collectionsStatus: collectionsStatus,
      message: "Debug information about VIBE collections"
    });
    
  } catch (error: any) {
    console.error('Error debugging VIBE collections:', error);
    
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to debug VIBE collections",
        error: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
} 