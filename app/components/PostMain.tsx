"use client";

import Link from "next/link";
import PostMainLikes from "./PostMainLikes";
import React, { useEffect, useState, memo, useCallback } from "react";
import useCreateBucketUrl from "../hooks/useCreateBucketUrl";
import { PostMainCompTypes } from "../types";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { usePlayerContext } from '@/app/context/playerContext';
import { AudioPlayer } from '@/app/components/AudioPlayer';
import Image from 'next/image';
import { FiShare2 } from 'react-icons/fi';
import ShareModal from './ShareModal';
import { useUser } from "@/app/context/user";
import { useGeneralStore } from "@/app/stores/general";
import getStripe from '@/libs/getStripe';
import useCheckPurchasedTrack from '@/app/hooks/useCheckPurchasedTrack';

interface Comment {
    id: string;
    user: {
        name: string;
        image: string;
    };
    text: string;
    created_at: string;
}

interface PostHeaderProps {
    profile: {
        user_id: string;
        name: string;
        image: string;
    };
    avatarUrl: string;
    avatarError: boolean;
    setAvatarError: (error: boolean) => void;
    text: string;
    genre: string;
}

interface PostImageProps {
    imageUrl: string;
    imageError: boolean;
}

const PostHeader = memo(({ profile, avatarUrl, avatarError, setAvatarError, text, genre }: PostHeaderProps) => (
    <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <Link href={`/profile/${profile.user_id}`}>
                <img
                    className="w-12 h-12 rounded-full object-cover"
                    src={avatarError ? '/images/placeholder-user.jpg' : avatarUrl}
                    alt={profile.name}
                    onError={() => setAvatarError(true)}
                />
            </Link>
            <div>
                <Link href={`/profile/${profile.user_id}`} className="text-white font-medium hover:underline">
                    {profile.name}
                </Link>
                <p className="text-[#818BAC] text-sm">{text}</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-[#818BAC] text-sm">{genre}</span>
        </div>
    </div>
));

PostHeader.displayName = 'PostHeader';

const PostImage = memo(({ imageUrl, imageError }: PostImageProps) => (
    <div className="relative w-full">
        <div 
            className="w-full aspect-square bg-cover bg-center relative overflow-hidden"
            style={{ 
                backgroundImage: imageError ? 
                    'linear-gradient(45deg, #2E2469, #351E43)' : 
                    `url(${imageUrl})`
            }}
        >
            {imageError && <PostImageFallback />}
        </div>
    </div>
));

PostImage.displayName = 'PostImage';

const PostImageFallback = memo(() => (
    <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center">
            <Image 
                src="/images/T-logo.svg" 
                alt="Default" 
                width={64}
                height={64}
                className="opacity-20"
            />
            <div className="mt-4 w-32 h-[1px] bg-white/10"></div>
            <div className="mt-4 space-y-2">
                {[...Array(3)].map((_, i) => (
                    <div 
                        key={i} 
                        className="h-1 bg-white/10 rounded"
                        style={{
                            width: `${Math.random() * 100 + 100}px`
                        }}
                    ></div>
                ))}
            </div>
        </div>
    </div>
));

PostImageFallback.displayName = 'PostImageFallback';

const PostMain = memo(({ post }: PostMainCompTypes) => {
    const [imageError, setImageError] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const m3u8Url = useCreateBucketUrl(post?.m3u8_url);
    const imageUrl = useCreateBucketUrl(post?.image_url);
    const avatarUrl = useCreateBucketUrl(post?.profile?.image);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const userContext = useUser();
    const { setIsLoginOpen } = useGeneralStore();
    //const { currentAudioId, setCurrentAudioId } = usePlayerContext();
    const pathname = usePathname();
    const [isPurchased, setIsPurchased] = useState(false);
    const { checkIfTrackPurchased } = useCheckPurchasedTrack();

    useEffect(() => {
        const loadImage = (url: string, setError: (error: boolean) => void) => {
            if (typeof window !== 'undefined') {
                const img = new window.Image();
                img.src = url;
                img.onerror = () => setError(true);
                img.onload = () => setError(false);
            }
        };

        if (imageUrl) loadImage(imageUrl, setImageError);
        if (avatarUrl) loadImage(avatarUrl, setAvatarError);
    }, [imageUrl, avatarUrl]);

    useEffect(() => {
        const checkPurchaseStatus = async () => {
            if (userContext?.user) {
                const purchased = await checkIfTrackPurchased(userContext.user.id, post.id);
                setIsPurchased(purchased);
            }
        };
        
        checkPurchaseStatus();
    }, [userContext?.user, post.id]);

    const handlePurchase = async () => {
        if (!userContext?.user) {
            setIsLoginOpen(true);
            return;
        }

        if (isProcessingPayment) return;

        try {
            setIsProcessingPayment(true);
            console.log('Starting purchase process');

            const response = await fetch("/api/checkout_sessions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    trackId: post.id,
                    trackName: post.trackname,
                    userId: userContext.user.id,
                    authorId: post.profile.user_id,
                    image: post.image_url,
                    audio: post.audio_url
                }),
            });

            console.log('Response from checkout session:', response);

            if (!response.ok) {
                throw new Error('Инициализация платежа не удалась');
            }

            const data = await response.json();
            console.log('Checkout session data:', data);
            
            const stripe = await getStripe();
            if (!stripe) {
                throw new Error('Не удалось инициализировать Stripe');
            }

            const { error } = await stripe.redirectToCheckout({
                sessionId: data.session.id
            });

            if (error) {
                throw error;
            }

        } catch (error: any) {
            console.error('Ошибка покупки:', error);
            toast.error(error.message || 'Платеж не удался. Пожалуйста, попробуйте снова.');
        } finally {
            setIsProcessingPayment(false);
        }
    };

    // Получаем текущий URL для шаринга
    const shareUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/post/${post.user_id}/${post.id}`
        : '';

    return (
        <div className="bg-[#24183d] rounded-2xl overflow-hidden mb-6 w-full max-w-[100%] md:w-[450px] mx-auto">
            <PostHeader 
                profile={post.profile}
                avatarUrl={avatarUrl}
                avatarError={avatarError}
                setAvatarError={setAvatarError}
                text={post.trackname}
                genre={post.genre}
            />

            <PostImage imageUrl={imageUrl} imageError={imageError} />

            <div className="px-4 py-2 w-full">
                        <AudioPlayer 
                            m3u8Url={m3u8Url} 
                            isPlaying={isPlaying} 
                            onPlay={() => setIsPlaying(true)} 
                            onPause={() => setIsPlaying(false)} 
                        />
                    </div>

            <div className="px-4 py-3 flex justify-between items-center w-full">
                <div className="flex items-center gap-6">
                        <PostMainLikes post={post} />
                    </div>

                <div className="flex items-center gap-4">
                    {!isPurchased ? (
                        <button 
                            onClick={handlePurchase}
                            disabled={isProcessingPayment}
                            className="bg-[#20DDBB] text-white px-4 py-2 rounded-lg"
                        >
                            {isProcessingPayment ? 'Processing...' : 'Buy Track $2'}
                        </button>
                    ) : (
                        <button className="bg-gray-500 text-white px-4 py-2 rounded-lg">
                            Purchased
                        </button>
                    )}
                    <button 
                        onClick={() => setIsShareModalOpen(true)}
                        className="text-white hover:text-[#20DDBB] transition-colors"
                    >
                        <FiShare2 size={24} />
                    </button>
                </div>
            </div>

            <ShareModal 
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                post={post}
            />
        </div>
    );
});

PostMain.displayName = 'PostMain';

export default PostMain;

