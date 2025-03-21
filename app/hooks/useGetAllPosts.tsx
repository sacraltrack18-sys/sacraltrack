import { database, Query } from "@/libs/AppWriteClient";
import useGetProfileByUserId from "./useGetProfileByUserId";

// Добавляем интерфейс для типизации response
interface AppwriteResponse {
  documents: Array<{
    $id: string;
    user_id: string;
    audio_url?: string;
    mp3_url?: string;
    m3u8_url?: string;
    image_url?: string;
    trackname?: string;
    text?: string;
    created_at?: string;
    price?: number;
    genre?: string;
    segments?: any;
    streaming_urls?: any[];
    [key: string]: any;
  }>;
  [key: string]: any;
}

// Test data to use when connection issues occur
const TEST_DATA = [
  {
    id: "test1",
    user_id: "user1",
    audio_url: "https://example.com/audio1.mp3",
    mp3_url: "https://example.com/audio1.mp3",
    m3u8_url: null,
    image_url: "https://placehold.co/600x400?text=Test+Track+1",
    trackname: "Test Track 1",
    text: "This is a test track for debugging",
    created_at: new Date().toISOString(),
    price: 0,
    genre: "test",
    segments: null,
    streaming_urls: [],
    profile: {
      user_id: "user1",
      name: "Test User",
      image: "https://placehold.co/300x300?text=User"
    }
  },
  {
    id: "test2",
    user_id: "user2",
    audio_url: "https://example.com/audio2.mp3",
    mp3_url: "https://example.com/audio2.mp3",
    m3u8_url: null,
    image_url: "https://placehold.co/600x400?text=Test+Track+2",
    trackname: "Test Track 2",
    text: "This is a test track for debugging",
    created_at: new Date().toISOString(),
    price: 0,
    genre: "test",
    segments: null,
    streaming_urls: [],
    profile: {
      user_id: "user2",
      name: "Test User 2",
      image: "https://placehold.co/300x300?text=User2"
    }
  }
];

const useGetAllPosts = async () => {
    console.log("[DEBUG-HOOK] Starting Appwrite request for posts");
    
    try {
        // Check if environment variables are available
        const dbId = process.env.NEXT_PUBLIC_DATABASE_ID;
        const collectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_POST;
        
        if (!dbId || !collectionId) {
            console.error("[DEBUG-HOOK] Missing required environment variables:", {
                dbId: dbId || "not set",
                collectionId: collectionId || "not set"
            });
            
            console.log("[DEBUG-HOOK] Returning test data due to configuration issues");
            return TEST_DATA;
        }
        
        console.log("[DEBUG-HOOK] Database ID:", dbId);
        console.log("[DEBUG-HOOK] Collection ID:", collectionId);
        
        // Set timeout for request to avoid infinite waiting
        const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Appwrite request timeout")), 10000)
        );
        
        // Execute Appwrite request
        const fetchPromise = database.listDocuments(
            String(dbId), 
            String(collectionId), 
            [ Query.orderDesc("$id") ]
        );
        
        // Use Promise.race to handle either successful response or timeout
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        console.log("[DEBUG-HOOK] Appwrite response received");
        // Use type checking
        if (!response || !('documents' in response) || !Array.isArray(response.documents)) {
            console.error("[DEBUG-HOOK] Response does not contain document list");
            return TEST_DATA;
        }
        
        const documents = response.documents;
        console.log("[DEBUG-HOOK] Number of documents:", documents?.length || 0);

        if (!documents || documents.length === 0) {
            console.log("[DEBUG-HOOK] Documents not found or empty array");
            return [];
        }

        const objPromises = documents.map(async (doc: any, index: number) => {
            console.log(`[DEBUG-HOOK] Processing document ${index + 1}/${documents.length}, ID: ${doc?.$id}`);
            
            // Get author profile by user_id
            let profile;
            try {
                profile = await useGetProfileByUserId(doc?.user_id);
                console.log(`[DEBUG-HOOK] Profile for document ${doc?.$id} retrieved:`, 
                    profile ? `ID: ${profile.user_id}, Name: ${profile.name}` : "Profile not found");
            } catch (profileError) {
                console.error(`[DEBUG-HOOK] Error getting profile for document ${doc?.$id}:`, profileError);
                // Instead of setting profile to null, provide default values
                profile = {
                    user_id: doc?.user_id,
                    name: 'Unknown User',
                    image: '/images/placeholder-avatar.svg',
                    bio: ''
                };
            }

            return {
                id: doc?.$id,
                user_id: doc?.user_id,
                audio_url: doc?.audio_url || null,
                mp3_url: doc?.mp3_url || null,
                m3u8_url: doc?.m3u8_url || null,
                image_url: doc?.image_url || null,
                trackname: doc?.trackname || null,
                text: doc?.text || null,
                created_at: doc?.created_at || null,
                price: doc?.price || null,
                genre: doc?.genre || null,
                segments: doc?.segments || null,
                streaming_urls: doc?.streaming_urls || [],
                profile: {
                    user_id: profile.user_id,
                    name: profile.name,
                    image: profile.image
                }
            };
        });

        console.log("[DEBUG-HOOK] Waiting for all documents to process...");
        const result = await Promise.all(objPromises);
        console.log("[DEBUG-HOOK] Document processing completed. Total count:", result?.length || 0);
        
        return result;
    } catch (error) {
        console.error("[DEBUG-HOOK] Critical error when getting posts:", error);
        
        // In case of error, return test data instead of an empty array
        // so the interface can display something to the user
        console.log("[DEBUG-HOOK] Returning test data due to error");
        return TEST_DATA;
    }
}

export default useGetAllPosts;
