import { NextResponse } from 'next/server';
import { Client, Databases, Permission, Role } from 'node-appwrite';

// Определяем типы для результатов
interface InitResultSuccess {
  collection: string;
  id: string;
  status: 'exists' | 'created';
  message?: string;
}

interface InitResultError {
  collection: string;
  id: string;
  status: 'error';
  error: string;
}

type InitResult = InitResultSuccess | InitResultError;

export async function GET() {
  try {
    console.log('Инициализация коллекций новостей...');
    
    // Создаем клиент с серверными правами
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL as string)
      .setProject(process.env.NEXT_PUBLIC_ENDPOINT as string)
      .setKey(process.env.APPWRITE_API_KEY as string);
    
    const databases = new Databases(client);
    const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID as string;
    
    // Проверяем переменные окружения
    console.log('Используемые переменные:', {
      appwrite_url: process.env.NEXT_PUBLIC_APPWRITE_URL,
      endpoint: process.env.NEXT_PUBLIC_ENDPOINT,
      database_id: process.env.NEXT_PUBLIC_DATABASE_ID,
      news_collection: process.env.NEXT_PUBLIC_COLLECTION_ID_NEWS,
      news_likes_collection: process.env.NEXT_PUBLIC_COLLECTION_ID_NEWS_LIKE,
    });
    
    const results: InitResult[] = [];
    
    // Проверяем и создаем коллекцию лайков новостей
    const newsLikesCollectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_NEWS_LIKE || '67db665e002906c5c567';
    
    try {
      // Проверяем существование коллекции
      await databases.listDocuments(databaseId, newsLikesCollectionId, []);
      console.log('Коллекция лайков новостей уже существует');
      results.push({
        collection: 'news_likes',
        id: newsLikesCollectionId,
        status: 'exists'
      });
    } catch (error: any) {
      console.log('Коллекция лайков новостей не найдена, создаем...');
      
      try {
        // Создаем коллекцию лайков новостей
        const collection = await databases.createCollection(
          databaseId,
          newsLikesCollectionId,
          'News Likes',
          [
            Permission.read(Role.any()),
            Permission.create(Role.users()),
            Permission.update(Role.user("user_id")),
            Permission.delete(Role.user("user_id"))
          ]
        );
        
        console.log('Коллекция лайков новостей создана:', collection.$id);
        
        // Создаем атрибуты
        await databases.createStringAttribute(
          databaseId,
          newsLikesCollectionId,
          'user_id',
          255,
          true
        );
        
        await databases.createStringAttribute(
          databaseId,
          newsLikesCollectionId,
          'news_id',
          255,
          true
        );
        
        await databases.createDatetimeAttribute(
          databaseId,
          newsLikesCollectionId,
          'created_at',
          false,
          new Date().toISOString()
        );
        
        console.log('Атрибуты коллекции лайков новостей созданы');
        
        results.push({
          collection: 'news_likes',
          id: newsLikesCollectionId,
          status: 'created'
        });
        
      } catch (createError: any) {
        console.error('Ошибка создания коллекции лайков новостей:', createError);
        results.push({
          collection: 'news_likes',
          id: newsLikesCollectionId,
          status: 'error',
          error: createError.message
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Инициализация коллекций новостей завершена',
      results
    });
    
  } catch (error: any) {
    console.error('Ошибка инициализации коллекций новостей:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Ошибка инициализации коллекций новостей',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET(); // Поддерживаем оба метода
}
