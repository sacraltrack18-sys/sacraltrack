import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import { CommentWithProfile } from '../types';
import useGetCommentsByPostId from '../hooks/useGetCommentsByPostId';
  
interface CommentStore {
    commentsByPostMap: Record<string, CommentWithProfile[]>;
    commentsByPost: CommentWithProfile[]; // Keep for backward compatibility
    setCommentsByPost: (postId: string) => Promise<CommentWithProfile[]>;
    getCommentsByPostId: (postId: string) => CommentWithProfile[];
}

export const useCommentStore = create<CommentStore>()( 
    devtools(
        persist(
            (set, get) => ({
                commentsByPostMap: {},
                commentsByPost: [], // Keep for backward compatibility

                setCommentsByPost: async (postId: string) => {
                    const result = await useGetCommentsByPostId(postId);
                    
                    set((state) => ({
                        commentsByPostMap: {
                            ...state.commentsByPostMap,
                            [postId]: result
                        },
                        commentsByPost: result // Keep backward compatibility
                    }));
                    
                    return result;
                },
                
                getCommentsByPostId: (postId: string) => {
                    return get().commentsByPostMap[postId] || [];
                },
            }),
            { 
                name: 'comment-store', 
                storage: createJSONStorage(() => localStorage) 
            }
        )
    )
)
