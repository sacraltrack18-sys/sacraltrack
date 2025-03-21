import { Account, Avatars, Client, Databases, ID, Query, Storage, Permission, Role } from 'appwrite';

// Добавляем логи для проверки переменных окружения
console.log("[APPWRITE-CONFIG] Checking environment variables...");
console.log("[APPWRITE-CONFIG] URL:", process.env.NEXT_PUBLIC_APPWRITE_URL || 'not set');
console.log("[APPWRITE-CONFIG] Project ID:", process.env.NEXT_PUBLIC_ENDPOINT || 'not set');
console.log("[APPWRITE-CONFIG] Database ID:", process.env.NEXT_PUBLIC_DATABASE_ID || 'не задано');
console.log("[APPWRITE-CONFIG] Collection ID (Post):", process.env.NEXT_PUBLIC_COLLECTION_ID_POST || 'не задано');

// Initialize Appwrite client
const client = new Client();

try {
    if (!process.env.NEXT_PUBLIC_APPWRITE_URL) {
        throw new Error('NEXT_PUBLIC_APPWRITE_URL is not set');
    }
    if (!process.env.NEXT_PUBLIC_ENDPOINT) {
        throw new Error('NEXT_PUBLIC_ENDPOINT is not set');
    }

    // Set up client
    client
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL)
        .setProject(process.env.NEXT_PUBLIC_ENDPOINT);
    
    console.log("[APPWRITE-CONFIG] Appwrite client successfully initialized");
} catch (error) {
    console.error("[APPWRITE-CONFIG] Error initializing Appwrite client:", error);
}

// Initialize services
const account = new Account(client);
const avatars = new Avatars(client);
const database = new Databases(client);
const storage = new Storage(client);

// Export services and utilities
export { client, account, avatars, database, storage, Query, ID, Permission, Role };

// Utility for checking Appwrite configuration
export const checkAppwriteConfig = () => {
  const config = {
    appwriteUrl: process.env.NEXT_PUBLIC_APPWRITE_URL || 'не задано',
    projectId: process.env.NEXT_PUBLIC_ENDPOINT || 'не задано',
    databaseId: process.env.NEXT_PUBLIC_DATABASE_ID || 'не задано',
    profileCollectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE || 'не задано',
    postCollectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_POST || 'не задано',
    friendsCollectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS || 'не задано'
  };
  
  const missingVars = Object.entries(config)
    .filter(([_, value]) => value === 'не задано')
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

// Проверяем конфигурацию при импорте
checkAppwriteConfig();



