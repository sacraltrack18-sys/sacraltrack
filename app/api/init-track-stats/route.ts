import { NextResponse } from 'next/server';
import { Client, Databases, ID, Models } from 'node-appwrite';
import { APPWRITE_CONFIG } from '@/libs/AppWriteClient';

// Обработчик для инициализации коллекций статистики треков
export async function GET(req: Request) {
  try {
    // Проверяем наличие API ключа
    if (!process.env.APPWRITE_API_KEY) {
      return NextResponse.json({ error: 'Отсутствует API ключ Appwrite' }, { status: 500 });
    }

    // Инициализируем клиент Appwrite
    const client = new Client()
      .setEndpoint(APPWRITE_CONFIG.endpoint)
      .setProject(APPWRITE_CONFIG.projectId)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    // Проверяем существующие коллекции
    let existingCollections: string[] = [];
    try {
      const collections = await databases.listCollections(APPWRITE_CONFIG.databaseId);
      existingCollections = collections.collections.map((coll: Models.Collection) => coll.$id);
    } catch (error) {
      console.error('Ошибка при получении списка коллекций:', error);
    }

    // Результаты проверки
    const results = [];

    // 1. Создание коллекции статистики треков (если не существует)
    if (!existingCollections.includes(APPWRITE_CONFIG.statisticsCollectionId)) {
      try {
        await databases.createCollection(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.statisticsCollectionId,
          'Track Statistics'
        );

        // Добавляем базовые атрибуты
        await databases.createStringAttribute(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.statisticsCollectionId,
          'track_id',
          255,   // max length
          true   // required
        );

        await databases.createIntegerAttribute(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.statisticsCollectionId,
          'plays_count',
          false,  // not required
          -1,    // min
          1000000000, // max
          0      // default
        );

        await databases.createIntegerAttribute(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.statisticsCollectionId,
          'downloads_count',
          false,  // not required
          -1,
          1000000000,
          0
        );

        await databases.createIntegerAttribute(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.statisticsCollectionId,
          'purchases_count',
          false,  // not required
          -1,
          1000000000,
          0
        );

        await databases.createIntegerAttribute(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.statisticsCollectionId,
          'likes',
          false,  // not required
          -1,
          1000000000,
          0
        );

        await databases.createIntegerAttribute(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.statisticsCollectionId,
          'shares',
          false,  // not required
          -1,
          1000000000,
          0
        );

        await databases.createDatetimeAttribute(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.statisticsCollectionId,
          'last_played',
          false  // not required
        );

        await databases.createDatetimeAttribute(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.statisticsCollectionId,
          'created_at',
          true  // required
        );

        await databases.createDatetimeAttribute(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.statisticsCollectionId,
          'updated_at',
          true  // required
        );

        results.push({ 
          collection: APPWRITE_CONFIG.statisticsCollectionId, 
          status: 'created',
          message: 'Коллекция статистики треков успешно создана'
        });
      } catch (error) {
        console.error('Ошибка при создании коллекции статистики треков:', error);
        results.push({ 
          collection: APPWRITE_CONFIG.statisticsCollectionId, 
          status: 'error', 
          error
        });
      }
    } else {
      results.push({ 
        collection: APPWRITE_CONFIG.statisticsCollectionId, 
        status: 'exists',
        message: 'Коллекция статистики треков уже существует'
      });
    }

    // 2. Создание коллекции аналитики треков (если не существует)
    if (!existingCollections.includes(APPWRITE_CONFIG.analyticsCollectionId)) {
      try {
        await databases.createCollection(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.analyticsCollectionId,
          'Track Analytics'
        );

        // Создаем базовые атрибуты
        await databases.createStringAttribute(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.analyticsCollectionId,
          'track_id',
          255,   // max length
          true   // required
        );

        await databases.createStringAttribute(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.analyticsCollectionId,
          'date',
          20,    // max length
          true   // required
        );

        await databases.createIntegerAttribute(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.analyticsCollectionId,
          'unique_listeners',
          false,  // not required
          0,
          1000000000,
          0
        );

        results.push({ 
          collection: APPWRITE_CONFIG.analyticsCollectionId, 
          status: 'created',
          message: 'Коллекция аналитики треков успешно создана'
        });
      } catch (error) {
        console.error('Ошибка при создании коллекции аналитики треков:', error);
        results.push({ 
          collection: APPWRITE_CONFIG.analyticsCollectionId, 
          status: 'error', 
          error
        });
      }
    } else {
      results.push({ 
        collection: APPWRITE_CONFIG.analyticsCollectionId, 
        status: 'exists',
        message: 'Коллекция аналитики треков уже существует'
      });
    }

    // 3. Создание коллекции взаимодействий с треками (если не существует)
    if (!existingCollections.includes(APPWRITE_CONFIG.interactionsCollectionId)) {
      try {
        await databases.createCollection(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.interactionsCollectionId,
          'Track Interactions'
        );

        // Создаем базовые атрибуты
        await databases.createStringAttribute(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.interactionsCollectionId,
          'track_id',
          255,   // max length
          true   // required
        );

        await databases.createStringAttribute(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.interactionsCollectionId,
          'user_id',
          255,   // max length
          true   // required
        );

        await databases.createStringAttribute(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.interactionsCollectionId,
          'interaction_type',
          50,    // max length
          true   // required
        );

        await databases.createDatetimeAttribute(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.interactionsCollectionId,
          'created_at',
          true  // required
        );

        results.push({ 
          collection: APPWRITE_CONFIG.interactionsCollectionId, 
          status: 'created',
          message: 'Коллекция взаимодействий с треками успешно создана'
        });
      } catch (error) {
        console.error('Ошибка при создании коллекции взаимодействий с треками:', error);
        results.push({ 
          collection: APPWRITE_CONFIG.interactionsCollectionId, 
          status: 'error', 
          error
        });
      }
    } else {
      results.push({ 
        collection: APPWRITE_CONFIG.interactionsCollectionId, 
        status: 'exists',
        message: 'Коллекция взаимодействий с треками уже существует'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Проверка и инициализация коллекций завершена',
      results
    });

  } catch (error) {
    console.error('Ошибка при инициализации коллекций статистики:', error);
    return NextResponse.json({ error: 'Ошибка при инициализации коллекций' }, { status: 500 });
  }
} 