"use client"
{/* COMMENT SECTION HEAD */}

import { useEffect, useState } from "react"
import Comments from "@/app/components/post/Comments"
import CommentsHeader from "@/app/components/post/CommentsHeader"
import Link from "next/link"
import { AiOutlineClose } from "react-icons/ai"
import { useRouter } from "next/navigation"
import ClientOnly from "@/app/components/ClientOnly"
import { PostPageTypes } from "@/app/types"
import { usePostStore } from "@/app/stores/post"
import { useLikeStore } from "@/app/stores/like"
import { useCommentStore } from "@/app/stores/comment"
import useCreateBucketUrl from "@/app/hooks/useCreateBucketUrl"
import { AudioPlayer } from '@/app/components/AudioPlayer'
import { usePlayerContext } from '@/app/context/playerContext'
import Image from 'next/image'


const PostImageFallback = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-[#2E2469] to-[#351E43]">
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
)
  
  export default function Post({ params }: PostPageTypes) {
    const { postById, setPostById, setPostsByUser } = usePostStore()
    const { setLikesByPost } = useLikeStore()
    const { setCommentsByPost } = useCommentStore()
    const { currentAudioId, setCurrentAudioId } = usePlayerContext()
    const [imageError, setImageError] = useState(false)
    const router = useRouter()

    const imageUrl = postById?.image_url ? useCreateBucketUrl(postById.image_url) : ''
    const m3u8Url = postById?.m3u8_url ? useCreateBucketUrl(postById.m3u8_url) : ''
    const isPlaying = currentAudioId === params.postId

    useEffect(() => { 
        const loadData = async () => {
            try {
                await Promise.all([
                    setPostById(params.postId),
                    setCommentsByPost(params.postId),
                    setLikesByPost(params.postId),
        setPostsByUser(params.userId) 
                ])
            } catch (error) {
                console.error('Error loading data:', error)
            }
        }
        loadData()
    }, [params.postId, params.userId])

    useEffect(() => {
        if (imageUrl) {
            const img = document.createElement('img')
            img.src = imageUrl
            img.onerror = () => setImageError(true)
            img.onload = () => setImageError(false)
        }
    }, [imageUrl])

    return (
        <div className="min-h-screen bg-[#1A1A2E] px-5">
            <div className="max-w-[calc(100vw-40px)] mx-auto py-8">
                {/* Track Section */}
                <div className="bg-[#24183D] rounded-2xl overflow-hidden shadow-xl relative">
                    {/* Track Header */}
                    <div className="relative h-[300px] md:h-[400px]">
                        {/* Background Image */}
                        <div 
                            className="absolute inset-0 bg-cover bg-center"
                            style={!imageError ? { 
                                backgroundImage: `url(${imageUrl})`,
                            } : undefined}
                        >
                            {imageError && <PostImageFallback />}
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#24183D]/50 to-[#24183D]" />
                        </div>

                        {/* Close Button - Highest z-index */}
                        <Link
                            href="/"
                            className="absolute top-4 right-4 z-30 p-2 rounded-xl 
                                     bg-black/30 backdrop-blur-sm text-white 
                                     hover:bg-[#2E2469] transition-all duration-200"
                        >
                            <AiOutlineClose size="20"/>
                        </Link>

                        {/* Track Info - Moved down by 40px */}
                        <div className="absolute top-[40px] right-0 z-20">
                            <ClientOnly>
                                {postById && <CommentsHeader post={postById} params={params}/>}
                            </ClientOnly>
                        </div>

                        {/* Track Info */}
                        <div className="absolute top-1/3 left-0 right-0 p-6 z-10">
                    <ClientOnly>
                                {postById && (
                                    <div className="space-y-2">
                                        <h1 className="text-3xl md:text-4xl font-bold text-white 
                                                     drop-shadow-lg">
                                            {postById.trackname}
                                        </h1>
                                        <div className="flex items-center gap-3">
                                            <Link 
                                                href={`/profile/${postById.profile.user_id}`}
                                                className="flex items-center gap-2 hover:text-[#20DDBB] 
                                                         transition-colors bg-black/30 backdrop-blur-sm 
                                                         rounded-full px-3 py-1"
                                            >
                                                <img 
                                                    src={useCreateBucketUrl(postById.profile.image)}
                                                    alt={postById.profile.name}
                                                    className="w-6 h-6 rounded-full"
                                                />
                                                <span className="text-white text-sm">
                                                    {postById.profile.name}
                                                </span>
                                            </Link>
                                            <span className="text-[#20DDBB] text-sm bg-black/30 
                                                           backdrop-blur-sm rounded-full px-3 py-1">
                                                {postById.genre}
                                            </span>
                            </div>
                                    </div>
                                )}
                            </ClientOnly>
                                </div>
                  
                        {/* Audio Player */}
                        <div className="absolute bottom-0 left-0 right-0">
                            <ClientOnly>
                                {m3u8Url && (
                                    <div className="px-6 py-4 bg-transparent">
                                        <AudioPlayer 
                                            m3u8Url={m3u8Url}
                                            isPlaying={isPlaying}
                                            onPlay={() => setCurrentAudioId(params.postId)}
                                            onPause={() => setCurrentAudioId(null)}
                                        />
                        </div>
                                )}
                    </ClientOnly>
                </div>
                </div>

                    {/* Comments Section */}
                    <div className="bg-[#24183D] rounded-b-2xl">
                        <ClientOnly>
                            {postById && (
                                <div className="p-6">
                                    <Comments params={params}/>
                                </div>
                            )}
                        </ClientOnly>
                </div>
                </div>
            </div>
        </div>
    )
}
