"use client"

{/* COMMENTS RIGHT SECTION */}

import Link from "next/link"
import { AiFillHeart } from "react-icons/ai"
import moment from "moment"
import { useUser } from "@/app/context/user"
import { useEffect, useState } from "react"
import { BiLoaderCircle } from "react-icons/bi"
import ClientOnly from "../ClientOnly"
import useCreateBucketUrl from "@/app/hooks/useCreateBucketUrl"
import { useLikeStore } from "@/app/stores/like"
import { useCommentStore } from "@/app/stores/comment"
import { useGeneralStore } from "@/app/stores/general"
import { useRouter } from "next/navigation"
import useIsLiked from "@/app/hooks/useIsLiked"
import useCreateLike from "@/app/hooks/useCreateLike"
import useDeleteLike from "@/app/hooks/useDeleteLike"
import useDeletePostById from "@/app/hooks/useDeletePostById"
import { CommentsHeaderCompTypes } from "@/app/types"
import { FiShare2 } from 'react-icons/fi'
import { BiPurchaseTag } from 'react-icons/bi'
import PostMainLikes from "@/app/components/PostMainLikes"
import ShareModal from "@/app/components/ShareModal"
import toast from "react-hot-toast"

export default function CommentsHeader({ post, params }: CommentsHeaderCompTypes) {
    const [isShareModalOpen, setIsShareModalOpen] = useState(false)
    const [hasClickedLike, setHasClickedLike] = useState(false)
    const [userLiked, setUserLiked] = useState(false)

    const contextUser = useUser()
    const { likesByPost, setLikesByPost } = useLikeStore()
    const { setIsLoginOpen } = useGeneralStore()

    useEffect(() => { 
        setLikesByPost(params?.postId)
        hasUserLikedPost()
    }, [params.postId, likesByPost])
    
    const hasUserLikedPost = () => {
        if (likesByPost.length < 1 || !contextUser?.user?.id) {
            setUserLiked(false)
            return
        }
        const res = useIsLiked(contextUser.user.id, params.postId, likesByPost)
        setUserLiked(!!res)
    }

    const handleLike = async () => {
        if (!contextUser?.user) return setIsLoginOpen(true)

        setHasClickedLike(true)
        try {
            if (!userLiked) {
                await useCreateLike(contextUser.user.id, params.postId)
            } else {
                const likeToDelete = likesByPost.find(
                    like => contextUser.user?.id === like.user_id && like.post_id === params.postId
                )
                if (likeToDelete) await useDeleteLike(likeToDelete.id)
            }
            await setLikesByPost(params.postId)
            hasUserLikedPost()
        } catch (error) {
            console.error(error)
            toast.error('Failed to process like')
        } finally {
            setHasClickedLike(false)
        }
    }

    const handlePurchase = async () => {
        if (!contextUser?.user) return setIsLoginOpen(true)

        try {
            const response = await fetch('/api/checkout_sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trackId: post.id,
                    trackName: post.text,
                }),
            })

            const { session } = await response.json()
            if (session?.url) {
                window.location.href = session.url
            } else {
                throw new Error('Failed to create checkout session')
            }
        } catch (error) {
            console.error('Error:', error)
            toast.error('Payment initialization failed')
        }
    }

    return (
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-4">
            {/* Actions Card */}
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4">
                <div className="flex items-center gap-6">
                    {/* Like Button */}
                    <button 
                        disabled={hasClickedLike}
                        onClick={handleLike}
                        className="flex items-center gap-2 text-white hover:text-[#20DDBB] transition-colors"
                    >
                        {hasClickedLike ? (
                            <BiLoaderCircle className="animate-spin" size={24}/>
                        ) : (
                            <AiFillHeart 
                                size={24} 
                                className={userLiked ? "text-[#20DDBB]" : ""}
                            />
                        )}
                        <span className="text-sm font-medium">
                            {likesByPost.length}
                        </span>
                    </button>

                    {/* Purchase Button */}
                    <button
                        onClick={handlePurchase}
                        className="flex items-center gap-2 text-white hover:text-[#20DDBB] transition-colors"
                    >
                        <BiPurchaseTag size={24} />
                        <span className="text-sm font-medium">
                            {post.price || '1.99'} $
                        </span>
                    </button>

                    {/* Share Button */}
                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="text-white hover:text-[#20DDBB] transition-colors"
                    >
                        <FiShare2 size={24} />
                    </button>
                </div>
            </div>

            {/* Track Info Card */}
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl px-4 py-2">
                <div className="flex items-center gap-4 text-sm text-white/80">
                    <div className="flex items-center gap-1">
                        <span className="text-[#20DDBB]">Released:</span>
                        <span>{moment(post.created_at).fromNow()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[#20DDBB]">Genre:</span>
                        <span>{post.genre}</span>
                    </div>
                </div>
            </div>

            <ShareModal 
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                post={post}
            />
            </div>
    )
}
