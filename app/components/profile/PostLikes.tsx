"use client";

import { useCallback, useState, useEffect } from "react";
import Link from "next/link";
import useCreateBucketUrl from "@/app/hooks/useCreateBucketUrl";
import { usePlayerContext } from '@/app/context/playerContext';
import { AudioPlayer } from '@/app/components/AudioPlayer';
import PostMainLikes from "./PostMainLikes";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import useGetCommentsByPostId from "@/app/hooks/useGetCommentsByPostId";
import { FaCommentDots } from "react-icons/fa";

interface PostLikesProps {
    post: {
        $id: string;
        user_id: string;
        trackname: string;
        audio_url: string;
        image_url: string;
        m3u8_url: string;
        created_at: string;
        profile: {
            user_id: string;
            name: string;
            image: string;
        };
    };
}

const PostLikes = ({ post }: PostLikesProps) => {
    console.log('PostLikes received post:', post);
    
    const router = useRouter();
    const { currentTrack, isPlaying, setCurrentTrack, togglePlayPause } = usePlayerContext();
    const [imageError, setImageError] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const [comments, setComments] = useState<any[]>([]);

    const imageUrl = useCreateBucketUrl(post?.image_url);
    const avatarUrl = useCreateBucketUrl(post?.profile?.image);
    const m3u8Url = useCreateBucketUrl(post?.m3u8_url);

    const isCurrentTrack = currentTrack?.id === post.$id;

    console.log('PostLikes - Raw post data:', post);
    
    // Преобразуем пост в формат, который ожидает PostMainLikes
    const formattedPost = {
        id: post.$id,
        user_id: post.user_id,
        trackname: post.trackname,
        audio_url: post.audio_url,
        image_url: post.image_url,
        m3u8_url: post.m3u8_url,
        created_at: post.created_at,
        text: '',
        price: 0,
        mp3_url: '',
        genre: '',
        profile: post.profile
    };
    
    console.log('PostLikes - Formatted post for PostMainLikes:', formattedPost);

    // Загрузка комментариев для поста
    useEffect(() => {
        const loadComments = async () => {
            try {
                const result = await useGetCommentsByPostId(post.$id);
                setComments(result);
            } catch (error) {
                console.error('Error loading comments:', error);
            }
        };

        loadComments();
    }, [post.$id]);

    const handlePlay = useCallback(() => {
        if (!post.m3u8_url) return;

        if (isCurrentTrack) {
            togglePlayPause();
        } else {
            setCurrentTrack({
                id: post.$id,
                audio_url: m3u8Url,
                image_url: imageUrl,
                name: post.trackname,
                artist: post.profile.name,
            });
            
            if (!isPlaying) {
                togglePlayPause();
            }
        }
    }, [isCurrentTrack, isPlaying, post, m3u8Url, imageUrl, setCurrentTrack, togglePlayPause]);

    // Переход на страницу комментариев
    const navigateToComments = () => {
        router.push(`/post/${post.$id}/${post.user_id}`);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-[#24183d]/80 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden 
                      shadow-[0_8px_32px_rgba(0,0,0,0.37)] transition-all duration-300
                      hover:shadow-[0_8px_32px_rgba(32,221,187,0.15)] hover:border-[#20DDBB]/20"
        >
            <div className="p-4 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                    <Link href={`/profile/${post.user_id}`}>
                        <motion.img
                            whileHover={{ scale: 1.05 }}
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-white/10 
                                     hover:ring-[#20DDBB]/50 transition-all duration-300"
                            src={avatarError ? '/images/placeholder-user.jpg' : avatarUrl}
                            alt={post.profile.name}
                            onError={() => setAvatarError(true)}
                        />
                    </Link>
                    <div>
                        <Link href={`/profile/${post.user_id}`} 
                              className="text-white font-medium hover:text-[#20DDBB] transition-colors">
                            {post.profile.name}
                        </Link>
                        <p className="text-[#818BAC] text-sm">{post.trackname}</p>
                    </div>
                </div>
            </div>

            <motion.div 
                className="relative w-full"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
            >
                <div 
                    onClick={handlePlay}
                    className="w-full aspect-square bg-cover bg-center relative overflow-hidden cursor-pointer
                             group transition-all duration-300"
                    style={{ 
                        backgroundImage: imageError ? 
                            'linear-gradient(45deg, #2E2469, #351E43)' : 
                            `url(${imageUrl})`
                    }}
                >
                    {imageError ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex flex-col items-center">
                                <motion.img 
                                    initial={{ opacity: 0.2, scale: 0.9 }}
                                    animate={{ opacity: 0.2, scale: 1 }}
                                    transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
                                    src="/images/T-logo.svg" 
                                    alt="Default" 
                                    className="w-16 h-16"
                                />
                                <div className="mt-4 w-32 h-[1px] bg-white/10"></div>
                            </div>
                        </div>
                    ) : (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 
                                      transition-opacity duration-300 flex items-center justify-center">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.2 }}
                                className="bg-[#20DDBB]/20 backdrop-blur-sm p-4 rounded-full"
                            >
                                {isCurrentTrack && isPlaying ? (
                                    <motion.div 
                                        initial={{ scale: 1 }}
                                        animate={{ scale: 1.1 }}
                                        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                                        className="w-8 h-8 rounded-full bg-[#20DDBB]"
                                    />
                                ) : (
                                    <svg className="w-8 h-8 text-[#20DDBB]" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M8 5v14l11-7z"/>
                                    </svg>
                                )}
                            </motion.div>
                        </div>
                    )}
                </div>
            </motion.div>

            <div className="px-4 py-2 border-t border-white/5">
                <AudioPlayer 
                    m3u8Url={m3u8Url}
                    isPlaying={isCurrentTrack && isPlaying}
                    onPlay={handlePlay}
                    onPause={togglePlayPause}
                />
            </div>

            <div className="px-4 py-3 flex justify-between items-center border-t border-white/5">
                <div className="flex items-center space-x-4">
                    <PostMainLikes post={formattedPost} />
                    
                    <button 
                        onClick={navigateToComments}
                        className="flex items-center space-x-1 text-white/60 hover:text-[#20DDBB] transition-colors group"
                    >
                        <motion.div
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.2 }}
                        >
                            <FaCommentDots size={20} className="group-hover:text-[#20DDBB]" />
                        </motion.div>
                        <span className="text-xs group-hover:text-[#20DDBB]">{comments.length}</span>
                    </button>
                </div>
                <div className="text-[#818BAC] text-sm">
                    {new Date(post.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    })}
                </div>
            </div>
        </motion.div>
    );
};

export default PostLikes; 