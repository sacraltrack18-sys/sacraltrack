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
              : result.filter(post => post.genre?.toLowerCase() === genre.toLowerCase())
          }));
        },

        setAllPosts: async () => {
          const result = await useGetAllPosts();
          const { selectedGenre } = get();
          const filteredPosts = selectedGenre === 'all' 
            ? result.slice(0, 5)
            : result
                .filter(post => post.genre?.toLowerCase() === selectedGenre)
                .slice(0, 5);

          set({ 
            allPosts: filteredPosts,
            hasMore: result.length > 5,
            page: 2
          });
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
              .filter((post) => post.trackname && post.trackname.toLowerCase().includes(query.toLowerCase()))
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
          try {
            set({ isLoading: true });
            const result = await useGetAllPosts();
            const { page, selectedGenre } = get();
            
            const filteredPosts = selectedGenre === 'all' 
              ? result 
              : result.filter(post => post.genre?.toLowerCase() === selectedGenre);

            const startIndex = (page - 1) * 5;
            const newPosts = filteredPosts.slice(startIndex, startIndex + 5);

            if (newPosts.length < 5 || startIndex + 5 >= filteredPosts.length) {
              set({ hasMore: false });
            }

            set((state) => ({
              allPosts: [...state.allPosts, ...newPosts],
              page: state.page + 1,
            }));
          } catch (error) {
            console.error('Error loading more posts:', error);
          } finally {
            set({ isLoading: false });
          }
        },
      }),
      {
        name: "post-store",
        storage: createJSONStorage(() => localStorage),
      }
    )
  )
);