import { Client, Account, Databases, Storage } from 'appwrite';

export const APPWRITE_CONFIG = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_URL || 'https://cloud.appwrite.io/v1',
  projectId: process.env.NEXT_PUBLIC_ENDPOINT || 'sacraltrack',
  databaseId: process.env.NEXT_PUBLIC_DATABASE_ID || 'sacraltrack',
  storageId: process.env.NEXT_PUBLIC_BUCKET_ID || '6615406df11fae74aa22',
  userCollectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE || '66153a8f7b78573b9600',
  trackCollectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_POST || '66153a7fb96389aef673',
  statisticsCollectionId: 'track_statistics',
  analyticsCollectionId: 'track_analytics',
  interactionsCollectionId: 'track_interactions',
};

// Create a new Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_CONFIG.endpoint)
  .setProject(APPWRITE_CONFIG.projectId);

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

export { client, account, databases, storage }; 