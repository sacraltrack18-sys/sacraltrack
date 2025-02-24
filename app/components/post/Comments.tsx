"use client"

import { useState, useEffect, useRef } from "react"
import { CommentsCompTypes } from "@/app/types"
import { BiLoaderCircle } from "react-icons/bi"
import { useUser } from "@/app/context/user"
import { useGeneralStore } from "@/app/stores/general"
import useCreateComment from "@/app/hooks/useCreateComment"
import useDeleteComment from "@/app/hooks/useDeleteComment"
import { useCommentStore } from "@/app/stores/comment"
import moment from "moment"
import Link from "next/link"
import useCreateBucketUrl from "@/app/hooks/useCreateBucketUrl"
import { IoSendSharp } from "react-icons/io5"
import { BsReply, BsTrash } from "react-icons/bs"
import toast from "react-hot-toast"

export default function Comments({ params }: CommentsCompTypes) {
    const commentsContainerRef = useRef<HTMLDivElement>(null)
    const [comment, setComment] = useState<string>('')
    const [inputFocused, setInputFocused] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null)
    
    const userContext = useUser()
    const { setIsLoginOpen } = useGeneralStore()
    const { commentsByPost, setCommentsByPost } = useCommentStore()

    useEffect(() => {
        setCommentsByPost(params.postId)
    }, [params.postId])

    const addComment = async () => {
        if (!userContext?.user) return setIsLoginOpen(true)
        if (!comment.trim()) return

        try {
            setIsSubmitting(true)
            await useCreateComment(
                userContext?.user?.id || '', 
                params.postId, 
                replyTo ? `@${replyTo.name} ${comment}` : comment
            )
            await setCommentsByPost(params.postId)
            setComment('')
            setReplyTo(null)
            toast.success('Comment added!')
            
            if (commentsContainerRef.current) {
                commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to add comment')
        } finally {
            setIsSubmitting(false)
        }
    }

    const deleteComment = async (commentId: string) => {
        if (!confirm('Are you sure you want to delete this comment?')) return

        try {
            setIsDeleting(commentId)
            await useDeleteComment(commentId)
            await setCommentsByPost(params.postId)
            toast.success('Comment deleted')
        } catch (error) {
            console.error(error)
            toast.error('Failed to delete comment')
        } finally {
            setIsDeleting(null)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            addComment()
        }
    }

    return (
        <div className="relative flex flex-col h-full">
            {/* Comments List */}
            <div 
                ref={commentsContainerRef}
                className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#2E2469] scrollbar-track-transparent"
                style={{ maxHeight: 'calc(80vh - 180px)' }}
            >
                <div className="p-4 space-y-4">
                    {commentsByPost.map((comment) => (
                        <div key={comment.id} className="flex gap-3 group">
                            <Link href={`/profile/${comment.profile.user_id}`}>
                                <img 
                                    className="w-10 h-10 rounded-full object-cover"
                                    src={useCreateBucketUrl(comment.profile.image) || '/images/placeholder-user.jpg'}
                                    alt={comment.profile.name}
                                />
                            </Link>
                            <div className="flex-1">
                                <div className="bg-[#2E2469] rounded-2xl p-3 transition-all">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <Link 
                                                href={`/profile/${comment.profile.user_id}`}
                                                className="text-white font-medium hover:text-[#20DDBB] transition-colors"
                                            >
                                                {comment.profile.name}
                                            </Link>
                                            <span className="text-[#818BAC] text-xs">
                                                {moment(comment.created_at).fromNow()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setReplyTo({ 
                                                    id: comment.id, 
                                                    name: comment.profile.name 
                                                })}
                                                className="text-white hover:text-[#20DDBB] transition-colors"
                                            >
                                                <BsReply size={16} />
                                            </button>
                                            {userContext?.user?.id === comment.profile.user_id && (
                                                <button
                                                    onClick={() => deleteComment(comment.id)}
                                                    disabled={isDeleting === comment.id}
                                                    className="text-white hover:text-red-500 transition-colors"
                                                >
                                                    {isDeleting === comment.id ? (
                                                        <BiLoaderCircle className="animate-spin" size={16} />
                                                    ) : (
                                                        <BsTrash size={16} />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-white text-sm whitespace-pre-wrap">
                                        {comment.text}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Comment Input */}
            <div className="sticky bottom-0 bg-[#24183D] border-t border-[#2E2469] p-4">
                {replyTo && (
                    <div className="flex items-center justify-between mb-2 px-2 py-1 bg-[#2E2469] rounded-lg">
                        <span className="text-sm text-[#818BAC]">
                            Replying to <span className="text-[#20DDBB]">@{replyTo.name}</span>
                        </span>
                        <button 
                            onClick={() => setReplyTo(null)}
                            className="text-[#818BAC] hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                )}
                <div 
                    className={`flex items-center gap-3 bg-[#2E2469] rounded-2xl p-2 transition-all ${
                        inputFocused ? 'ring-2 ring-[#20DDBB]' : ''
                    }`}
                >
                    {userContext?.user?.id && (
                        <img 
                            className="w-8 h-8 rounded-full object-cover"
                            src={useCreateBucketUrl(userContext.user.image) || '/images/placeholder-user.jpg'}
                            alt="Your avatar"
                        />
                    )}
                    <input 
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={handleKeyPress}
                        onFocus={() => setInputFocused(true)}
                        onBlur={() => setInputFocused(false)}
                        placeholder={replyTo ? `Reply to @${replyTo.name}...` : "Add a comment..."}
                        className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-sm"
                    />
                    <button
                        onClick={addComment}
                        disabled={isSubmitting || !comment.trim()}
                        className={`p-2 rounded-xl transition-all ${
                            isSubmitting || !comment.trim()
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-[#20DDBB] hover:bg-[#20DDBB] hover:text-black'
                        }`}
                    >
                        {isSubmitting ? (
                            <BiLoaderCircle className="animate-spin" size={20} />
                        ) : (
                            <IoSendSharp size={20} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
