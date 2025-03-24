import { NextResponse } from 'next/server';
import { Client, Databases, Permission, Role, IndexType } from 'node-appwrite';

export async function GET() {
  try {
    // Initialize the Appwrite client
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL!)
      .setProject(process.env.NEXT_PUBLIC_ENDPOINT!)
      .setKey(process.env.APPWRITE_API_KEY!); // Make sure to add this to your environment variables

    const databases = new Databases(client);
    const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!;

    // Create Collections
    await createVibePostsCollection(databases, databaseId);
    await createVibeLikesCollection(databases, databaseId);
    await createVibeCommentsCollection(databases, databaseId);
    await createVibeViewsCollection(databases, databaseId);

    return NextResponse.json({ 
      message: 'Vibe collections initialized successfully', 
      collections: [
        'vibe_posts',
        'vibe_likes',
        'vibe_comments',
        'vibe_views'
      ]
    });
  } catch (error) {
    console.error('Failed to initialize Vibe collections:', error);
    return NextResponse.json(
      { error: 'Failed to initialize Vibe collections', details: error },
      { status: 500 }
    );
  }
}

async function createVibePostsCollection(databases: Databases, databaseId: string) {
  try {
    // Check if collection already exists
    try {
      await databases.listDocuments(databaseId, 'vibe_posts');
      console.log('vibe_posts collection already exists');
      return;
    } catch (error) {
      // Collection doesn't exist, create it
    }

    // Create vibe_posts collection
    const collection = await databases.createCollection(
      databaseId,
      'vibe_posts',
      'Vibe Posts',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.user("user_id")),
        Permission.delete(Role.user("user_id"))
      ]
    );

    // Create attributes
    await databases.createStringAttribute(
      databaseId,
      'vibe_posts',
      'user_id',
      255,
      true,
      undefined,
      false
    );

    await databases.createEnumAttribute(
      databaseId,
      'vibe_posts',
      'type',
      ['photo', 'video', 'sticker'],
      true
    );

    await databases.createStringAttribute(
      databaseId,
      'vibe_posts',
      'media_url',
      1024,
      true,
      undefined,
      false
    );

    await databases.createStringAttribute(
      databaseId,
      'vibe_posts',
      'caption',
      1024,
      false,
      '',
      false
    );

    await databases.createStringAttribute(
      databaseId,
      'vibe_posts',
      'mood',
      255,
      false,
      '',
      false
    );

    await databases.createDatetimeAttribute(
      databaseId,
      'vibe_posts',
      'created_at',
      true,
      undefined,
      false
    );

    await databases.createStringAttribute(
      databaseId,
      'vibe_posts',
      'location',
      255,
      false,
      '',
      false
    );

    await databases.createStringAttribute(
      databaseId,
      'vibe_posts',
      'tags',
      255,
      false,
      undefined,
      true // array
    );

    // Create stats object as individual number attributes
    await databases.createIntegerAttribute(
      databaseId,
      'vibe_posts',
      'total_likes',
      false,
      0
    );
    
    await databases.createIntegerAttribute(
      databaseId,
      'vibe_posts',
      'total_comments',
      false,
      0
    );
    
    await databases.createIntegerAttribute(
      databaseId,
      'vibe_posts',
      'total_views',
      false,
      0
    );

    // Create indexes with proper IndexType
    await databases.createIndex(
      databaseId,
      'vibe_posts',
      'user_id_index',
      IndexType.Key,
      ['user_id']
    );

    await databases.createIndex(
      databaseId,
      'vibe_posts',
      'type_index',
      IndexType.Key,
      ['type']
    );

    await databases.createIndex(
      databaseId,
      'vibe_posts',
      'created_at_index',
      IndexType.Key,
      ['created_at']
    );

    console.log('vibe_posts collection created successfully');
  } catch (error) {
    console.error('Error creating vibe_posts collection:', error);
    throw error;
  }
}

async function createVibeLikesCollection(databases: Databases, databaseId: string) {
  try {
    // Check if collection already exists
    try {
      await databases.listDocuments(databaseId, 'vibe_likes');
      console.log('vibe_likes collection already exists');
      return;
    } catch (error) {
      // Collection doesn't exist, create it
    }

    // Create vibe_likes collection
    const collection = await databases.createCollection(
      databaseId,
      'vibe_likes',
      'Vibe Likes',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.user("user_id")),
        Permission.delete(Role.user("user_id"))
      ]
    );

    // Create attributes
    await databases.createStringAttribute(
      databaseId,
      'vibe_likes',
      'user_id',
      255,
      true,
      undefined,
      false
    );

    await databases.createStringAttribute(
      databaseId,
      'vibe_likes',
      'vibe_id',
      255,
      true,
      undefined,
      false
    );

    await databases.createDatetimeAttribute(
      databaseId,
      'vibe_likes',
      'created_at',
      true,
      undefined,
      false
    );

    // Create indexes with proper IndexType for vibe_likes
    await databases.createIndex(
      databaseId,
      'vibe_likes',
      'user_id_index',
      IndexType.Key,
      ['user_id']
    );

    await databases.createIndex(
      databaseId,
      'vibe_likes',
      'vibe_id_index',
      IndexType.Key,
      ['vibe_id']
    );

    // Create a unique compound index
    await databases.createIndex(
      databaseId,
      'vibe_likes',
      'user_vibe_unique',
      IndexType.Unique,
      ['user_id', 'vibe_id']
    );

    console.log('vibe_likes collection created successfully');
  } catch (error) {
    console.error('Error creating vibe_likes collection:', error);
    throw error;
  }
}

async function createVibeCommentsCollection(databases: Databases, databaseId: string) {
  try {
    // Check if collection already exists
    try {
      await databases.listDocuments(databaseId, 'vibe_comments');
      console.log('vibe_comments collection already exists');
      return;
    } catch (error) {
      // Collection doesn't exist, create it
    }

    // Create vibe_comments collection
    const collection = await databases.createCollection(
      databaseId,
      'vibe_comments',
      'Vibe Comments',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.user("user_id")),
        Permission.delete(Role.user("user_id"))
      ]
    );

    // Create attributes
    await databases.createStringAttribute(
      databaseId,
      'vibe_comments',
      'user_id',
      255,
      true,
      undefined,
      false
    );

    await databases.createStringAttribute(
      databaseId,
      'vibe_comments',
      'vibe_id',
      255,
      true,
      undefined,
      false
    );

    await databases.createStringAttribute(
      databaseId,
      'vibe_comments',
      'text',
      2000, // Longer text
      true,
      undefined,
      false
    );

    await databases.createDatetimeAttribute(
      databaseId,
      'vibe_comments',
      'created_at',
      true,
      undefined,
      false
    );

    // Create indexes
    await databases.createIndex(
      databaseId,
      'vibe_comments',
      'user_id_index',
      IndexType.Key,
      ['user_id']
    );

    await databases.createIndex(
      databaseId,
      'vibe_comments',
      'vibe_id_index',
      IndexType.Key,
      ['vibe_id']
    );

    await databases.createIndex(
      databaseId,
      'vibe_comments',
      'created_at_index',
      IndexType.Key,
      ['created_at']
    );

    console.log('vibe_comments collection created successfully');
  } catch (error) {
    console.error('Error creating vibe_comments collection:', error);
    throw error;
  }
}

async function createVibeViewsCollection(databases: Databases, databaseId: string) {
  try {
    // Check if collection already exists
    try {
      await databases.listDocuments(databaseId, 'vibe_views');
      console.log('vibe_views collection already exists');
      return;
    } catch (error) {
      // Collection doesn't exist, create it
    }

    // Create vibe_views collection
    const collection = await databases.createCollection(
      databaseId,
      'vibe_views',
      'Vibe Views',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.user("user_id")),
        Permission.delete(Role.user("user_id"))
      ]
    );

    // Create attributes
    await databases.createStringAttribute(
      databaseId,
      'vibe_views',
      'user_id',
      255,
      false, // Not required since anonymous views are allowed
      undefined,
      false
    );

    await databases.createStringAttribute(
      databaseId,
      'vibe_views',
      'vibe_id',
      255,
      true,
      undefined,
      false
    );

    await databases.createStringAttribute(
      databaseId,
      'vibe_views',
      'device_info',
      1024,
      false,
      undefined,
      false
    );

    await databases.createDatetimeAttribute(
      databaseId,
      'vibe_views',
      'created_at',
      true,
      undefined,
      false
    );

    // Create indexes
    await databases.createIndex(
      databaseId,
      'vibe_views',
      'vibe_id_index',
      IndexType.Key,
      ['vibe_id']
    );

    await databases.createIndex(
      databaseId,
      'vibe_views',
      'user_id_index',
      IndexType.Key,
      ['user_id']
    );

    console.log('vibe_views collection created successfully');
  } catch (error) {
    console.error('Error creating vibe_views collection:', error);
    throw error;
  }
} 