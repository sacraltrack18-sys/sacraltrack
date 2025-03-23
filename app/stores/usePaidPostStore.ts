import { create } from 'zustand';
import useGetPaidPostByUserId, { PaidPostData } from '@/app/hooks/useGetPaidPostByUserId';
import { database } from '@/libs/AppWriteClient';

interface PaidPostStore {
  paidPosts: PaidPostData[];
  loading: boolean;
  error: string | null;
  setPaidPosts: (userId: string) => Promise<void>;
}

export const usePaidPostStore = create<PaidPostStore>((set) => ({
  paidPosts: [],
  loading: false,
  error: null,
  setPaidPosts: async (userId: string) => {
    try {
      set({ loading: true, error: null });
      
      // 1. Fetch the paid posts data (cart items)
      const paidPostsData = await useGetPaidPostByUserId(userId);
      
      // 2. Create an array to store enhanced posts
      const enhancedPosts: PaidPostData[] = [];
      
      // 3. For each paid post, fetch the complete post data
      for (const paidPost of paidPostsData) {
        try {
          // Get all post IDs from cart_items
          const postIds = paidPost.cart_items || [];
          
          // For each post ID, fetch the complete post data
          for (const postId of postIds) {
            try {
              // Get post details
              const postDoc = await database.getDocument(
                String(process.env.NEXT_PUBLIC_DATABASE_ID),
                String(process.env.NEXT_PUBLIC_COLLECTION_ID_POSTS),
                postId
              );
              
              // Get profile details
              let profileData = null;
              try {
                profileData = await database.getDocument(
                  String(process.env.NEXT_PUBLIC_DATABASE_ID),
                  String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE),
                  postDoc.user_id
                );
              } catch (profileError) {
                console.warn(`Could not fetch profile for user ${postDoc.user_id}:`, profileError);
              }
              
              // Create an enhanced post object with all required fields
              enhancedPosts.push({
                id: postId,
                user_id: postDoc.user_id,
                cart_items: paidPost.cart_items,
                audio_url: postDoc.audio_url,
                mp3_url: postDoc.mp3_url,
                trackname: postDoc.trackname,
                image_url: postDoc.image_url,
                text: postDoc.text,
                created_at: postDoc.created_at,
                price: postDoc.price,
                genre: postDoc.genre,
                likes: postDoc.likes,
                comments: postDoc.comments,
                profile: profileData ? {
                  id: profileData.id,
                  user_id: profileData.user_id,
                  name: profileData.name,
                  image: profileData.image
                } : undefined
              });
            } catch (postError) {
              console.warn(`Could not fetch post ${postId}:`, postError);
            }
          }
        } catch (error) {
          console.warn(`Error processing paid post:`, error);
        }
      }
      
      set({ paidPosts: enhancedPosts, loading: false });
    } catch (error) {
      console.error('Error fetching paid posts:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch paid posts', 
        loading: false 
      });
    }
  }
})); 