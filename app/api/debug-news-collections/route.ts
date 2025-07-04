import { NextResponse } from 'next/server';
import { Client, Databases } from 'node-appwrite';

// Определяем типы для результатов
interface CollectionResultSuccess {
  collection: string;
  id: string;
  status: 'exists';
  documents_count: number;
  sample_documents?: any[];
  note?: string;
}

interface CollectionResultError {
  collection: string;
  id: string;
  status: 'error';
  error: string;
}

type CollectionResult = CollectionResultSuccess | CollectionResultError;

export async function GET() {
  try {
    console.log('Отладка коллекций новостей...');
    
    // Создаем клиент
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL as string)
      .setProject(process.env.NEXT_PUBLIC_ENDPOINT as string);
    
    // Если есть API ключ, используем его для расширенных прав
    if (process.env.APPWRITE_API_KEY) {
      client.setKey(process.env.APPWRITE_API_KEY);
    }
    
    const databases = new Databases(client);
    const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID as string;
    
    // Информация о переменных окружения
    const envInfo = {
      appwrite_url: process.env.NEXT_PUBLIC_APPWRITE_URL,
      endpoint: process.env.NEXT_PUBLIC_ENDPOINT,
      database_id: process.env.NEXT_PUBLIC_DATABASE_ID,
      news_collection: process.env.NEXT_PUBLIC_COLLECTION_ID_NEWS,
      news_likes_collection: process.env.NEXT_PUBLIC_COLLECTION_ID_NEWS_LIKE,
      has_api_key: !!process.env.APPWRITE_API_KEY
    };
    
    const results: CollectionResult[] = [];
    
    // Проверяем коллекцию новостей
    const newsCollectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_NEWS || '68285239000757a15e82';
    try {
      const newsResponse = await databases.listDocuments(databaseId, newsCollectionId, []);
      results.push({
        collection: 'news',
        id: newsCollectionId,
        status: 'exists',
        documents_count: newsResponse.total,
        sample_documents: newsResponse.documents.slice(0, 3).map(doc => ({
          id: doc.$id,
          title: doc.name || doc.title,
          likes: doc.likes || 0
        }))
      });
    } catch (error: any) {
      results.push({
        collection: 'news',
        id: newsCollectionId,
        status: 'error',
        error: error.message
      });
    }
    
    // Проверяем коллекцию лайков новостей
    const newsLikesCollectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_NEWS_LIKE || '67db665e002906c5c567';
    try {
      const likesResponse = await databases.listDocuments(databaseId, newsLikesCollectionId, []);
      results.push({
        collection: 'news_likes',
        id: newsLikesCollectionId,
        status: 'exists',
        documents_count: likesResponse.total,
        sample_documents: likesResponse.documents.slice(0, 5).map(doc => ({
          id: doc.$id,
          user_id: doc.user_id,
          news_id: doc.news_id || doc.post_id,
          created_at: doc.created_at
        }))
      });
    } catch (error: any) {
      results.push({
        collection: 'news_likes',
        id: newsLikesCollectionId,
        status: 'error',
        error: error.message
      });
    }
    
    // Проверяем старую коллекцию лайков (для совместимости)
    const oldLikesCollectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_LIKE || 'likes';
    if (oldLikesCollectionId !== newsLikesCollectionId) {
      try {
        const oldLikesResponse = await databases.listDocuments(databaseId, oldLikesCollectionId, []);
        results.push({
          collection: 'old_likes',
          id: oldLikesCollectionId,
          status: 'exists',
          documents_count: oldLikesResponse.total,
          note: 'This is the old likes collection, might need migration'
        });
      } catch (error: any) {
        results.push({
          collection: 'old_likes',
          id: oldLikesCollectionId,
          status: 'error',
          error: error.message
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      environment: envInfo,
      collections: results,
      recommendations: [
        results.find(r => r.collection === 'news_likes' && r.status === 'error') ? 
          'Коллекция лайков новостей не найдена. Запустите /api/init-news-collections для создания.' : null,
        results.find(r => r.collection === 'news' && r.status === 'error') ? 
          'Коллекция новостей не найдена. Проверьте NEXT_PUBLIC_COLLECTION_ID_NEWS.' : null,
        'Убедитесь, что все переменные окружения настроены правильно.'
      ].filter(Boolean)
    });
    
  } catch (error: any) {
    console.error('Ошибка отладки коллекций новостей:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Ошибка отладки коллекций новостей',
        details: error.message
      },
      { status: 500 }
    );
  }
}
