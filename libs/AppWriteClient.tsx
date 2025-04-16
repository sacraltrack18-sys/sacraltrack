import { Account, Avatars, Client, Databases, ID, Query, Storage, Permission, Role, Functions } from 'appwrite';
// Import everything from node-appwrite
import * as NodeAppwrite from 'node-appwrite';

// Appwrite конфигурация для использования во всем приложении
export const APPWRITE_CONFIG = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_URL || 'https://cloud.appwrite.io/v1',
  projectId: process.env.NEXT_PUBLIC_ENDPOINT || '67f223590032b871e5f6',
  databaseId: process.env.NEXT_PUBLIC_DATABASE_ID || '67f225f50010cced7742',
  storageId: process.env.NEXT_PUBLIC_BUCKET_ID || '67f2239600384003fd78',
  userCollectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE || '67f225fc0022b2dc0881',
  trackCollectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_POST || '67f22813001f125cc1e5',
  statisticsCollectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_TRACK_STATISTICS || 'track_statistics',
  analyticsCollectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_TRACK_ANALYTICS || 'track_analytics',
  interactionsCollectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_TRACK_INTERACTIONS || 'track_interactions',
  
  // Добавление коллекций для вайбов
  vibesCollectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS || '67f22eb700352cd35cd8',
  vibeCommentsCollectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_COMMENTS || '67f2307500286019354c',
  vibeLikesCollectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_LIKES || '67f22ff30010feacfd1b',
  
  // Для обратной совместимости с старыми ключами
  friendsCollectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS || '67f22b92000e12316e52',
};

// Добавляем логи для проверки переменных окружения
console.log("[APPWRITE-CONFIG] Checking environment variables...");
console.log("[APPWRITE-CONFIG] URL:", APPWRITE_CONFIG.endpoint);
console.log("[APPWRITE-CONFIG] Project ID:", APPWRITE_CONFIG.projectId);
console.log("[APPWRITE-CONFIG] Database ID:", APPWRITE_CONFIG.databaseId);
console.log("[APPWRITE-CONFIG] Collection ID (Post):", APPWRITE_CONFIG.trackCollectionId);
console.log("[APPWRITE-CONFIG] Collection ID (Vibes):", APPWRITE_CONFIG.vibesCollectionId);
console.log("[APPWRITE-CONFIG] Collection ID (Statistics):", APPWRITE_CONFIG.statisticsCollectionId);
console.log("[APPWRITE-CONFIG] Collection ID (Analytics):", APPWRITE_CONFIG.analyticsCollectionId);
console.log("[APPWRITE-CONFIG] Collection ID (Interactions):", APPWRITE_CONFIG.interactionsCollectionId);
console.log("[APPWRITE-CONFIG] Bucket ID:", APPWRITE_CONFIG.storageId);

// Initialize Appwrite client
const client = new Client();

try {
    if (!process.env.NEXT_PUBLIC_APPWRITE_URL) {
        throw new Error('NEXT_PUBLIC_APPWRITE_URL is not set');
    }
    if (!process.env.NEXT_PUBLIC_ENDPOINT) {
        throw new Error('NEXT_PUBLIC_ENDPOINT is not set');
    }
    if (!process.env.NEXT_PUBLIC_BUCKET_ID) {
        console.error('[APPWRITE-CONFIG] ERROR: NEXT_PUBLIC_BUCKET_ID is not set');
    }

    console.log('[APPWRITE-CONFIG] Initializing with parameters:', {
        endpoint: APPWRITE_CONFIG.endpoint,
        projectId: APPWRITE_CONFIG.projectId,
        bucketId: APPWRITE_CONFIG.storageId,
    });

    // Set up client with improved options for WebSocket stability
    client
        .setEndpoint(APPWRITE_CONFIG.endpoint)
        .setProject(APPWRITE_CONFIG.projectId);
        
    // Configure client for better realtime performance
    if (typeof window !== 'undefined') {
        // Set up event listeners for connection status
        client.subscribe('realtime', (data: any) => {
            if (data.event === 'disconnected') {
                console.log('[REALTIME] Disconnected. Attempting to reconnect...');
                // Reconnection is handled automatically by the client
            }
            if (data.event === 'connected') {
                console.log('[REALTIME] Connected successfully');
            }
        });
    }
    
    console.log("[APPWRITE-CONFIG] Appwrite client successfully initialized");
} catch (error) {
    console.error("[APPWRITE-CONFIG] Error initializing Appwrite client:", error);
}

// Initialize services
const account = new Account(client);
const avatars = new Avatars(client);
const database = new Databases(client);
const storage = new Storage(client);
const functions = new Functions(client);

// Для обратной совместимости с app/config/appwrite.ts
const databases = database;

// Helper function for server-side uploads
export const createServerSideStorage = () => {
  // For server-side use
  const nodeClient = new NodeAppwrite.Client();
  nodeClient
    .setEndpoint(APPWRITE_CONFIG.endpoint)
    .setProject(APPWRITE_CONFIG.projectId);
  
  // Create server-side storage instance
  return new NodeAppwrite.Storage(nodeClient);
};

// Utility function to upload a file from a file path
export const uploadFileFromPath = async (
  filePath: string, 
  fileName: string,
  bucketId: string = 'audio',
  fileId: string = ID.unique()
) => {
  const serverStorage = createServerSideStorage();
  
  // Use a simple approach that works with node-appwrite
  return serverStorage.createFile(
    bucketId,
    fileId,
    {
      path: filePath,
      filename: fileName,
    } as any // We use 'as any' to bypass TypeScript's strong typing for now
  );
};

// Export services and utilities
export { client, account, avatars, database, databases, storage, functions, Query, ID, Permission, Role, NodeAppwrite };

// Utility for checking Appwrite configuration
export const checkAppwriteConfig = () => {
  const config = {
    appwriteUrl: APPWRITE_CONFIG.endpoint,
    projectId: APPWRITE_CONFIG.projectId,
    databaseId: APPWRITE_CONFIG.databaseId,
    profileCollectionId: APPWRITE_CONFIG.userCollectionId,
    postCollectionId: APPWRITE_CONFIG.trackCollectionId,
    vibesCollectionId: APPWRITE_CONFIG.vibesCollectionId,
    vibeCommentsCollectionId: APPWRITE_CONFIG.vibeCommentsCollectionId,
    vibeLikesCollectionId: APPWRITE_CONFIG.vibeLikesCollectionId,
    friendsCollectionId: APPWRITE_CONFIG.friendsCollectionId,
    bucketId: APPWRITE_CONFIG.storageId
  };
  
  const missingVars = Object.entries(config)
    .filter(([_, value]) => !value || value === '')
    .map(([key]) => key);
  
  console.log("[APPWRITE-CONFIG] Результаты проверки конфигурации:", {
    config,
    isValid: missingVars.length === 0,
    missingVars
  });
  
  return {
    config,
    isValid: missingVars.length === 0,
    missingVars
  };
};

// Функция для проверки соединения с Appwrite и валидности текущей сессии
export const checkAppwriteConnection = async () => {
  try {
    console.log("[APPWRITE-CONNECTION] Checking Appwrite connection...");
    
    // Проверяем активную сессию пользователя
    let sessionValid = false;
    try {
      const session = await account.get();
      sessionValid = !!session;
      console.log("[APPWRITE-CONNECTION] User session:", sessionValid ? "Valid" : "Not found");
      console.log("[APPWRITE-CONNECTION] User data:", session);
    } catch (sessionError) {
      console.warn("[APPWRITE-CONNECTION] Session check failed:", sessionError);
    }
    
    // Проверяем доступность хранилища
    let storageValid = false;
    try {
      // Проверяем существование бакета через список файлов
      await storage.listFiles(APPWRITE_CONFIG.storageId);
      storageValid = true;
      console.log("[APPWRITE-CONNECTION] Storage bucket check: Valid");
    } catch (storageError) {
      console.error("[APPWRITE-CONNECTION] Storage bucket check failed:", storageError);
    }
    
    // Проверяем доступность базы данных
    let databaseValid = false;
    try {
      // Используем метод getDocument вместо listCollections
      await database.listDocuments(
        APPWRITE_CONFIG.databaseId, 
        APPWRITE_CONFIG.userCollectionId,
        []
      );
      databaseValid = true;
      console.log("[APPWRITE-CONNECTION] Database check: Valid");
    } catch (dbError) {
      console.error("[APPWRITE-CONNECTION] Database check failed:", dbError);
    }
    
    return {
      connected: true,
      sessionValid,
      storageValid,
      databaseValid,
      config: APPWRITE_CONFIG
    };
  } catch (error) {
    console.error("[APPWRITE-CONNECTION] Connection check failed:", error);
    return {
      connected: false,
      sessionValid: false,
      storageValid: false,
      databaseValid: false,
      error: error instanceof Error ? error.message : String(error),
      config: APPWRITE_CONFIG
    };
  }
};

// Проверяем конфигурацию при импорте
checkAppwriteConfig();



