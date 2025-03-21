import { Account, Avatars, Client, Databases, ID, Query, Storage, Permission, Role } from 'appwrite';

// Initialize Appwrite client
const client = new Client();

// Set up client
client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL || '')
  .setProject(process.env.NEXT_PUBLIC_ENDPOINT || '');

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
    friendsCollectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS || 'не задано'
  };
  
  const missingVars = Object.entries(config)
    .filter(([_, value]) => value === 'не задано')
    .map(([key]) => key);
  
  return {
    config,
    isValid: missingVars.length === 0,
    missingVars
  };
};



