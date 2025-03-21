// app/stores/post.ts
import { create } from "zustand";
import { persist, devtools, createJSONStorage } from "zustand/middleware";
import { Post, PostWithProfile } from "../types";
import useGetAllPosts from "../hooks/useGetAllPosts";
import useGetPostsByUser from "../hooks/useGetPostsByUserId";
import useGetPostById from "../hooks/useGetPostById";

interface PostStore {
  allPosts: PostWithProfile[];
  postsByUser: {
    id: string;
    user_id: any;
    audio_url: any;
    mp3_url: any;
    m3u8_url: any;
    trackname: any;
    image_url: any;
    text: any;
    created_at: any;
    price: any;
    genre: any;
    type: string;
    name: string;
    image: string;
    profile: any; // Add the profile property here
  }[];
  postById: PostWithProfile | null;
  selectedGenre: string;
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  setGenre: (genre: string) => void;
  setAllPosts: () => void;
  setPostsByUser: (userId: string) => void;
  setPostById: (postId: string) => void;
  setPage: (page: number) => void;
  loadMorePosts: () => Promise<void>;
  searchTracksByName: (query: string) => Promise<{ id: string; name: string; image: string; type: string }[]>;
}

export const usePostStore = create<PostStore>()(
  devtools(
    persist(
      (set, get) => ({
        allPosts: [],
        postsByUser: [],
        postById: null,
        selectedGenre: "all",
        page: 1,
        hasMore: true,
        isLoading: false,

        setGenre: async (genre: string) => {
          const result = await useGetAllPosts();
          set((state) => ({
            ...state,
            selectedGenre: genre,
            page: 1,
            hasMore: true,
            allPosts: genre === 'all' 
              ? result 
              : result.filter((post: PostWithProfile) => post.genre?.toLowerCase() === genre.toLowerCase())
          }));
        },

        setAllPosts: async () => {
          console.log("[DEBUG] Starting post loading");
          set({ isLoading: true });
          
          try {
            const result = await useGetAllPosts();
            
            if (!result) {
              console.error("[DEBUG] Empty result received from useGetAllPosts");
              set({ 
                isLoading: false,
                allPosts: []
              });
              return;
            }
            
            console.log("[DEBUG] Data received from Appwrite:", result);
            console.log("[DEBUG] Number of posts in result:", result?.length || 0);
            
            const { selectedGenre, page } = get();
            console.log("[DEBUG] Current genre:", selectedGenre, "Current page:", page);
            
            // Filter posts by selected genre
            const filteredPosts = selectedGenre === 'all' 
              ? result 
              : result.filter((post: PostWithProfile) => post.genre?.toLowerCase() === selectedGenre.toLowerCase());
            
            console.log("[DEBUG] Posts after genre filtering:", filteredPosts?.length || 0);
            
            // For first load, show first 5 posts
            if (page <= 1) {
              const postsToShow = filteredPosts.slice(0, 5);
              console.log("[DEBUG] Loading first posts. Displaying:", postsToShow?.length || 0);
              
              set({ 
                allPosts: postsToShow,
                hasMore: filteredPosts.length > 5,
                page: 2,
                isLoading: false
              });
            } else {
              // For subsequent updates, maintain current scroll position
              const currentlyLoadedCount = Math.max((page - 1) * 5, 5); // Ensure at least 5 posts
              const postsToShow = filteredPosts.slice(0, currentlyLoadedCount);
              console.log("[DEBUG] Updating existing posts. Displaying:", postsToShow?.length || 0);
              
              set({ 
                allPosts: postsToShow,
                hasMore: filteredPosts.length > currentlyLoadedCount,
                isLoading: false
              });
            }
          } catch (error) {
            console.error('[DEBUG] Error loading posts:', error);
            set({ 
              isLoading: false,
              // Don't reset allPosts to an empty array if data was previously loaded
              ...(get().allPosts.length === 0 ? { allPosts: [] } : {})
            });
          }
        },
        
        setPostsByUser: async (userId: string) => {
          const result = await useGetPostsByUser(userId);
          set({ 
            postsByUser: result.map((post) => ({
              id: post.id,
              user_id: post.user_id,
              audio_url: post.audio_url,
              mp3_url: post.mp3_url,
              m3u8_url: post.m3u8_url,
              trackname: post.trackname,
              image_url: post.image_url,
              text: post.text,
              created_at: post.created_at,
              price: post.price,
              genre: post.genre,
              type: "post", // Assuming "post" as the type
            name: post.trackname, // Assuming "trackname" as the name
            image: post.image_url, // Assuming "image_url" as the image
            profile: null, // Set profile to null if it doesn't exist
            }))
          });
        },
        
        
        
        setPostById: async (postId: string) => {
          const result = await useGetPostById(postId);
          set({ postById: result });
        },
      
        searchTracksByName: async (query: string) => {
          try {
            console.log("Searching for tracks with query:", query);
            let allPosts = await get().allPosts;
        
            // If allPosts is empty, fetch all posts
            if (!allPosts || allPosts.length === 0) {
              await get().setAllPosts();
              allPosts = await get().allPosts;
            }
        
            // Filter the allPosts array to only include tracks that match the query
            const filteredPosts = allPosts
              .filter((post: PostWithProfile) => post.trackname && post.trackname.toLowerCase().includes(query.toLowerCase()))
              .map((post) => ({
                id: post.id,
                name: post.trackname,
                image: post.image_url,
                type: "track",
              }));
        
            console.log("Filtered posts:", filteredPosts);
            return filteredPosts;
          } catch (error) {
            console.error("Error searching tracks:", error);
            return [];
          }
        },
        
        setPage: (page: number) => set({ page }),

        loadMorePosts: async () => {
          console.log("[DEBUG] Loading more posts...");
          const { page, selectedGenre, allPosts, isLoading } = get();
          
          // Prevent multiple simultaneous loading requests
          if (isLoading) {
            console.log("[DEBUG] Already loading posts, skipping...");
            return;
          }
          
          try {
            set({ isLoading: true });
            
            const result = await useGetAllPosts();
            if (!result || result.length === 0) {
              console.log("[DEBUG] No posts received from API");
              set({ hasMore: false, isLoading: false });
              return;
            }
            
            // Filter by genre if needed
            const filteredPosts = selectedGenre === 'all' 
              ? result 
              : result.filter((post: PostWithProfile) => post.genre?.toLowerCase() === selectedGenre.toLowerCase());
            
            // Calculate the correct slice for pagination
            const currentCount = allPosts.length;
            const postsPerPage = 5;
            const nextPosts = filteredPosts.slice(currentCount, currentCount + postsPerPage);
            
            console.log("[DEBUG] Current posts count:", currentCount);
            console.log("[DEBUG] New posts to add:", nextPosts.length);
            console.log("[DEBUG] Total available posts:", filteredPosts.length);
            
            // Check if we've reached the end
            const hasMorePosts = currentCount + postsPerPage < filteredPosts.length;
            
            // Only update if we have new posts to add
            if (nextPosts.length > 0) {
              set((state) => ({
                allPosts: [...state.allPosts, ...nextPosts],
                page: state.page + 1,
                hasMore: hasMorePosts,
                isLoading: false
              }));
            } else {
              set({ 
                hasMore: false,
                isLoading: false
              });
            }
          } catch (error) {
            console.error('[DEBUG] Error loading more posts:', error);
            set({ isLoading: false });
          }
        },
      }),
      {
        name: "post-store",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist these specific states
          allPosts: state.allPosts,
          postsByUser: state.postsByUser,
          postById: state.postById,
          page: state.page,
          hasMore: state.hasMore,
          // Explicitly NOT persisting selectedGenre so it resets to "all" on refresh
        }),
        onRehydrateStorage: () => (state) => {
          // Force selectedGenre to "all" after rehydration
          if (state) {
            state.selectedGenre = "all";
          }
        },
      }
    )
  )
);