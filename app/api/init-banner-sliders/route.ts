import { NextResponse } from 'next/server';
import { Client, Databases, ID, Permission, Role, IndexType } from 'node-appwrite';

export async function GET(request: Request) {
  try {
    // Проверяем, есть ли API ключ в переменных окружения
    const apiKey = process.env.APPWRITE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'Missing APPWRITE_API_KEY in environment variables'
      }, { status: 500 });
    }

    // Проверяем наличие ID коллекции в переменных окружения
    const collectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_BANNER_SLIDERS;
    if (!collectionId) {
      return NextResponse.json({
        error: 'Missing NEXT_PUBLIC_COLLECTION_ID_BANNER_SLIDERS in environment variables'
      }, { status: 500 });
    }

    // Инициализируем клиент Appwrite
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL!)
      .setProject(process.env.NEXT_PUBLIC_ENDPOINT!)
      .setKey(apiKey);

    const databases = new Databases(client);
    const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!;

    // Проверяем существование коллекции
    let collectionExists = false;
    try {
      await databases.getCollection(databaseId, collectionId);
      collectionExists = true;
    } catch (error) {
      console.log('Collection does not exist, creating...');
    }

    // Если коллекция уже существует, возвращаем информацию о ней
    if (collectionExists) {
      return NextResponse.json({
        success: true,
        message: 'Banner Sliders collection already exists',
        collectionId
      });
    }

    // Создаем коллекцию с ID из переменных окружения
    const collection = await databases.createCollection(
      databaseId,
      collectionId, // Используем существующий ID вместо ID.unique()
      'Banner Sliders',
      [
        Permission.read(Role.any()),       // Читать могут все
        Permission.create(Role.team('administrators')), // Создавать только админы
        Permission.update(Role.team('administrators')), // Обновлять только админы
        Permission.delete(Role.team('administrators'))  // Удалять только админы
      ]
    );

    // Создаем атрибуты для коллекции
    // 1. Обязательные поля
    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'image_url',
      1024,
      true,
      undefined
    );

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'title',
      255,
      true,
      undefined
    );

    await databases.createDatetimeAttribute(
      databaseId,
      collectionId,
      'start_date',
      true,
      undefined
    );

    await databases.createBooleanAttribute(
      databaseId,
      collectionId,
      'is_active',
      true,
      true
    );

    await databases.createIntegerAttribute(
      databaseId,
      collectionId,
      'position',
      true,
      0,
      0,
      1000
    );

    await databases.createDatetimeAttribute(
      databaseId,
      collectionId,
      'created_at',
      true,
      undefined
    );

    await databases.createDatetimeAttribute(
      databaseId,
      collectionId,
      'updated_at',
      true,
      undefined
    );

    // 2. Необязательные поля
    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'subtitle',
      255,
      false,
      ''
    );

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'description',
      1000,
      false,
      ''
    );

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'link_url',
      1024,
      false,
      ''
    );

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'action_text',
      100,
      false,
      'Подробнее'
    );

    await databases.createDatetimeAttribute(
      databaseId,
      collectionId,
      'end_date',
      false,
      undefined
    );

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'bg_color',
      50,
      false,
      ''
    );

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'text_color',
      50,
      false,
      ''
    );

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'campaign_id',
      255,
      false,
      ''
    );

    // 3. Создаем индексы
    await databases.createIndex(
      databaseId,
      collectionId,
      'position_index',
      IndexType.Key,
      ['position']
    );

    await databases.createIndex(
      databaseId,
      collectionId,
      'active_index',
      IndexType.Key,
      ['is_active']
    );

    await databases.createIndex(
      databaseId,
      collectionId,
      'date_range_index',
      IndexType.Key,
      ['start_date', 'end_date']
    );

    await databases.createIndex(
      databaseId,
      collectionId,
      'campaign_index',
      IndexType.Key,
      ['campaign_id']
    );

    // Возвращаем информацию о созданной коллекции
    return NextResponse.json({
      success: true,
      message: 'Banner Sliders collection created successfully',
      collectionId: collectionId,
      collection
    });
  } catch (error: any) {
    console.error('Error creating Banner Sliders collection:', error);
    return NextResponse.json({
      error: 'Failed to create Banner Sliders collection',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
} 