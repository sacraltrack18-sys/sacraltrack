// app/stores/post.ts
import { create } from "zustand";
import { persist, devtools, createJSONStorage } from "zustand/middleware";
import { Post, PostWithProfile } from "../types";
import useGetAllPosts from "../hooks/useGetAllPosts";
import useGetPostsByUser from "../hooks/useGetPostsByUserId";
import useGetPostById from "../hooks/useGetPostById";

interface PostStore {
  allPosts: PostWithProfile[];
  displayedPosts: PostWithProfile[]; // New property to store only displayed posts
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
  currentPlayingPostId: string | null; // Added to track currently playing post from PostMain
  setGenre: (genre: string) => void;
  setAllPosts: () => void;
  setPostsByUser: (userId: string) => void;
  setPostById: (postId: string) => void;
  setPage: (page: number) => void;
  setCurrentPlayingPostId: (id: string | null) => void; // Added setter
  loadMorePosts: () => Promise<void>;
  searchTracksByName: (query: string) => Promise<{ id: string; name: string; image: string; type: string; matchType?: string; user_id: string }[]>;
}

export const usePostStore = create<PostStore>()(
  devtools(
    persist(
      (set, get) => ({
        allPosts: [],
        displayedPosts: [], // Initialize with empty array
        postsByUser: [],
        postById: null,
        selectedGenre: "all",
        page: 1,
        hasMore: true,
        isLoading: false,
        currentPlayingPostId: null, // Initial state

        setCurrentPlayingPostId: (id) => set({ currentPlayingPostId: id }), // Implementation

        setGenre: async (genre: string) => {
          set({ isLoading: true, page: 1 });
          
          try {
          const result = await useGetAllPosts();
            
            // Filter posts by genre
            const filteredPosts = genre === 'all' 
              ? result 
              : result.filter((post: PostWithProfile) => post.genre?.toLowerCase() === genre.toLowerCase());
            
            // Display only first 5 posts
            const initialPosts = filteredPosts.slice(0, 5);
            
          set((state) => ({
            ...state,
            selectedGenre: genre,
              allPosts: filteredPosts, // Store all filtered posts
              displayedPosts: initialPosts, // Show only first 5
              hasMore: filteredPosts.length > 5,
              page: 2, // Set page to 2 for next load
              isLoading: false
            }));
          } catch (error) {
            console.error('[DEBUG] Error loading posts for genre:', error);
            set({ isLoading: false });
          }
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
                allPosts: [],
                displayedPosts: []
              });
              return;
            }
            
            console.log("[DEBUG] Data received from Appwrite:", result);
            console.log("[DEBUG] Number of posts in result:", result?.length || 0);
            
            const { selectedGenre } = get();
            console.log("[DEBUG] Current genre:", selectedGenre);
            
            // Filter posts by selected genre
            const filteredPosts = selectedGenre === 'all' 
              ? result 
              : result.filter((post: PostWithProfile) => post.genre?.toLowerCase() === selectedGenre.toLowerCase());
            
            console.log("[DEBUG] Posts after genre filtering:", filteredPosts?.length || 0);
            
            // For first load, show only first 5 posts
            const postsToShow = filteredPosts.slice(0, 5);
            console.log("[DEBUG] Loading first posts. Displaying:", postsToShow?.length || 0);
            
            set({ 
              allPosts: filteredPosts, // Store all filtered posts
              displayedPosts: postsToShow, // Show only first 5
              hasMore: filteredPosts.length > 5,
              page: 2, // Start with page 2 for next load
              isLoading: false
            });
            console.log("[DEBUG] setAllPosts state after set:", {
              allPosts: filteredPosts.length,
              displayedPosts: postsToShow.length,
              hasMore: filteredPosts.length > 5
            });
          } catch (error) {
            console.error('[DEBUG] Error loading posts:', error);
            set({ 
              isLoading: false,
              allPosts: [],
              displayedPosts: []
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
            console.log("Searching for tracks and content with query:", query);
            let allPosts = await get().allPosts;

            // If allPosts is empty, fetch all posts
            if (!allPosts || allPosts.length === 0) {
              await get().setAllPosts();
              allPosts = await get().allPosts;
            }

            // Normalize the search term
            const normalizedQuery = query.trim().toLowerCase();

            if (!normalizedQuery) return [];

            // Enhanced search algorithm for tracks and content
            const filteredPosts = allPosts
              .filter((post: PostWithProfile) => {
                // Get all searchable text fields
                const trackName = post.trackname?.toLowerCase() || '';
                const postText = post.text?.toLowerCase() || '';
                const description = post.description?.toLowerCase() || '';
                const artistName = post.profile?.name?.toLowerCase() || '';

                // Check for match in any of the text fields
                return trackName.includes(normalizedQuery) ||
                       postText.includes(normalizedQuery) ||
                       description.includes(normalizedQuery) ||
                       artistName.includes(normalizedQuery);
              })
              .map((post) => {
                // Determine what matched for better display
                const trackName = post.trackname?.toLowerCase() || '';
                const postText = post.text?.toLowerCase() || '';
                const description = post.description?.toLowerCase() || '';
                const artistName = post.profile?.name?.toLowerCase() || '';

                let matchType = "track";
                let displayName = post.trackname;

                if (trackName.includes(normalizedQuery)) {
                  matchType = "track";
                  displayName = post.trackname;
                } else if (artistName.includes(normalizedQuery)) {
                  matchType = "artist";
                  displayName = `${post.trackname} by ${post.profile?.name}`;
                } else if (postText.includes(normalizedQuery)) {
                  matchType = "content";
                  displayName = `${post.trackname} (content match)`;
                } else if (description.includes(normalizedQuery)) {
                  matchType = "description";
                  displayName = `${post.trackname} (description match)`;
                }

                return {
                  id: post.id,
                  name: displayName,
                  image: post.image_url,
                  type: "track",
                  matchType: matchType,
                  user_id: post.user_id
                };
              })
              .slice(0, 10); // Limit results to 10

            console.log("Filtered tracks and content:", filteredPosts);
            return filteredPosts;
          } catch (error) {
            console.error("Error searching tracks:", error);
            return [];
          }
        },
        
        setPage: (page: number) => set({ page }),

        loadMorePosts: async () => {
          const { page, allPosts, displayedPosts, isLoading, hasMore } = get();
          
          // Prevent multiple simultaneous loading requests or loading when there are no more posts
          if (isLoading || !hasMore) {
            if (isLoading) console.log("[DEBUG] Already loading posts, skipping...");
            if (!hasMore) console.log("[DEBUG] No more posts to load, skipping...");
            return;
          }
          
          console.log("[DEBUG] Loading more posts...");
          set({ isLoading: true });

          try {
            // We already have all posts in memory, just need to display more
            const postsPerPage = 5;
            const startIndex = displayedPosts.length;
            const endIndex = startIndex + postsPerPage;
            
            // Get next batch of posts
            const nextPosts = allPosts.slice(startIndex, endIndex);
            
            console.log("[DEBUG] Current displayed posts count:", displayedPosts.length);
            console.log("[DEBUG] Adding posts:", nextPosts.length);
            console.log("[DEBUG] Total available posts:", allPosts.length);
            
            // Check if we've reached the end
            const hasMorePosts = endIndex < allPosts.length;
            
            // Only update if we have new posts to add
            if (nextPosts.length > 0) {
              set((state) => {
                const updated = {
                  displayedPosts: [...state.displayedPosts, ...nextPosts],
                  page: state.page + 1,
                  hasMore: hasMorePosts,
                  isLoading: false
                };
                console.log("[DEBUG] loadMorePosts state after set:", {
                  displayedPosts: updated.displayedPosts.length,
                  hasMore: updated.hasMore
                });
                return updated;
              });
            } else {
              set({ 
                hasMore: false,
                isLoading: false
              });
              console.log("[DEBUG] No more posts to add. hasMore set to false.");
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
          displayedPosts: state.displayedPosts,
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