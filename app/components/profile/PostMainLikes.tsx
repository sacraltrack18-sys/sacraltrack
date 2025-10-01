/*
КОМПОНЕНТ ЛАЙКОВ ДЛЯ ЛАЙКНУТЫХ ТРЕКОВ:
1. Создан специальный компонент для обработки лайков в карточках лайкнутых треков
2. Добавлена обработка ошибок при загрузке лайков и их создании/удалении
3. Добавлены анимации для лайков при наведении и нажатии
4. Добавлена проверка на наличие ID поста
5. Оптимизирован внешний вид компонента, чтобы соответствовать дизайну приложения
*/

"use client";

import { AiFillHeart } from "react-icons/ai";
import { BiLoaderCircle } from "react-icons/bi";
import { useState, useEffect } from "react";
import { useUser } from "../../context/user";
import { useGeneralStore } from "../../stores/general";
import useGetLikesByPostId from "../../hooks/useGetLikesByPostId";
import useIsLiked from "../../hooks/useIsLiked";
import useCreateLike from "../../hooks/useCreateLike";
import useDeleteLike from "../../hooks/useDeleteLike";
import { motion } from "framer-motion";

interface PostMainLikesProps {
    post: {
        id: string;
        user_id: string;
        // Остальные поля могут быть опциональными
    };
}

export default function PostMainLikes({ post }: PostMainLikesProps) {
    if (!post || !post.id) {
        console.error('PostMainLikes: post or post.id is undefined', post);
        return null;
    }

    const { setIsLoginOpen } = useGeneralStore();
    const contextUser = useUser();
    const [hasClickedLike, setHasClickedLike] = useState<boolean>(false);
    const [userLiked, setUserLiked] = useState<boolean>(false);
    const [likes, setLikes] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { 
        getAllLikesByPost();
    }, [post.id]);

    useEffect(() => { 
        hasUserLikedPost();
    }, [likes, contextUser]);

    const getAllLikesByPost = async () => {
        try {
            setError(null);
            const result = await useGetLikesByPostId(post.id);
            setLikes(result || []);
        } catch (error) {
            console.error('Error getting likes:', error);
            setLikes([]);
            setError('Failed to load likes');
        }
    };

    const hasUserLikedPost = () => {
        if (!contextUser?.user?.id) return;

        if (likes?.length < 1 || !contextUser?.user?.id) {
            setUserLiked(false);
            return;
        }
        
        const res = useIsLiked(contextUser?.user?.id, post.id, likes);
        setUserLiked(res ? true : false);
    };

    const like = async () => {
        setHasClickedLike(true);
        try {
            setError(null);
            if (!contextUser?.user?.id) {
                throw new Error('User not logged in');
            }
            await useCreateLike(contextUser.user.id, post.id);
            await getAllLikesByPost();
            hasUserLikedPost();
        } catch (error) {
            console.error('Error creating like:', error);
            setError('Failed to like');
        } finally {
            setHasClickedLike(false);
        }
    };

    const unlike = async (id: string) => {
        setHasClickedLike(true);
        try {
            setError(null);
            await useDeleteLike(id);
            await getAllLikesByPost();
            hasUserLikedPost();
        } catch (error) {
            console.error('Error deleting like:', error);
            setError('Failed to unlike');
        } finally {
            setHasClickedLike(false);
        }
    };

    const likeOrUnlike = () => {
        if (!contextUser?.user?.id) {
            setIsLoginOpen(true);
            return;
        }
        
        const res = useIsLiked(contextUser?.user?.id, post.id, likes);

        if (!res) {
            like();
        } else {
            likes.forEach((like: any) => {
                if (contextUser?.user?.id === like?.user_id && like?.post_id === post?.id) {
                    unlike(like?.id);
                }
            });
        }
    };

    return (
        <button 
            disabled={hasClickedLike}
            onClick={() => likeOrUnlike()}
            className="flex items-center space-x-1 text-white/60 hover:text-[#20DDBB] transition-colors group"
        >
            <motion.div 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
            >
                {!hasClickedLike ? (
                    <AiFillHeart 
                        color={likes?.length > 0 && userLiked ? '#FF0000' : 'white'} 
                        size={20} 
                        className={`transition-colors ${userLiked ? '' : 'group-hover:text-[#20DDBB]'}`}
                    />
                ) : (
                    <BiLoaderCircle className="animate-spin text-[#20DDBB]" size={20} />
                )}
            </motion.div>
            <span className="text-xs group-hover:text-[#20DDBB]">{likes?.length}</span>
        </button>
    );
} 