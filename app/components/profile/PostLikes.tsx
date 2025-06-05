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
    const { currentTrack, isPlaying, setCurrentTrack, togglePlayPause, currentAudioId, setCurrentAudioId, stopAllPlayback } = usePlayerContext();
    const [imageError, setImageError] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const [comments, setComments] = useState<any[]>([]);

    const imageUrl = useCreateBucketUrl(post?.image_url);
    const avatarUrl = useCreateBucketUrl(post?.profile?.image);
    const m3u8Url = useCreateBucketUrl(post?.m3u8_url);

    const isCurrentTrack = currentTrack?.id === post.$id;
    const isActiveInPlayer = currentAudioId === post.$id;

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

        if (isCurrentTrack && isPlaying) {
            // Если трек уже воспроизводится, останавливаем его
            stopAllPlayback();
            setCurrentAudioId(null);
        } else {
            // Устанавливаем текущий трек
            setCurrentTrack({
                id: post.$id,
                audio_url: m3u8Url,
                image_url: imageUrl,
                name: post.trackname,
                artist: post.profile.name,
            });
            
            // Активируем его в PlayerContext
            setCurrentAudioId(post.$id);
            
            // Если воспроизведение остановлено, запускаем
            if (!isPlaying) {
                togglePlayPause();
            }
        }
    }, [isCurrentTrack, isPlaying, post, m3u8Url, imageUrl, setCurrentTrack, togglePlayPause, setCurrentAudioId, stopAllPlayback]);

    // Переход на страницу комментариев
    const navigateToComments = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent event from bubbling up to parent elements
        router.push(`/post/${post.$id}/${post.user_id}`);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-[650px] mx-auto rounded-2xl bg-[#24183d]/70 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.15)] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.25)] flex flex-row items-center gap-0 p-0 overflow-hidden"
            style={{ height: '120px', minHeight: '120px' }}
        >
            {/* Artwork */}
            <div className="flex-shrink-0 h-[120px] w-[120px] flex items-center justify-center p-0 m-0">
                <img
                    className="w-full h-full object-cover rounded-none"
                    src={imageError ? '/images/T-logo.svg' : imageUrl}
                    alt={post.trackname}
                    onError={() => setImageError(true)}
                />
            </div>

            {/* Info and controls */}
            <div className="flex-1 flex flex-col justify-center min-w-0 h-full px-3 py-2 md:px-4 md:py-2">
                <div className="flex flex-row items-center h-full w-full min-w-0">
                    <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                        <div className="flex items-center gap-2 min-w-0 mt-1 md:mt-2">
                            <Link href={`/profile/${post.user_id}`} className="truncate text-white font-semibold text-base md:text-lg hover:text-[#20DDBB] transition-colors">
                                {post.profile.name}
                            </Link>
                            <span className="text-[#20DDBB] mx-1">•</span>
                            <span className="truncate text-[#F1F1F1] text-base md:text-lg font-medium">{post.trackname}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs md:text-sm text-[#818BAC]">{new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="w-full mt-1 md:mt-1 flex items-center">
                            <AudioPlayer 
                                m3u8Url={m3u8Url}
                                isPlaying={isCurrentTrack && isPlaying}
                                onPlay={() => {
                                    setCurrentAudioId(post.$id);
                                    setCurrentTrack({
                                        id: post.$id,
                                        audio_url: m3u8Url,
                                        image_url: imageUrl,
                                        name: post.trackname,
                                        artist: post.profile.name,
                                    });
                                    if (!isPlaying) togglePlayPause();
                                }}
                                onPause={() => {
                                    stopAllPlayback();
                                }}
                            />
                        </div>
                    </div>
                    {/* Like and comment */}
                    <div className="flex flex-col items-center justify-center h-full ml-2 md:ml-4 gap-2 py-2">
                        <div className="mb-[-12px]">
                            <PostMainLikes post={formattedPost} />
                        </div>
                        <button
                            onClick={navigateToComments}
                            className="flex items-center justify-center space-x-1 text-white/60 hover:text-[#20DDBB] transition-colors group w-[40px] h-[30px] mt-[12px]"
                        >
                            <img src="/images/comments.svg" className="w-[18px] h-[18px]" />
                            <span className="text-xs group-hover:text-[#20DDBB] ml-1 flex items-center">{comments.length}</span>
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default PostLikes; 