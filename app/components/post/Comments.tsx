"use client"

import { useState, useEffect, useRef } from "react"
import { CommentsCompTypes, CommentWithProfile } from "@/app/types"
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
import { BsReply, BsTrash, BsEmojiSmile } from "react-icons/bs"
import { FaMusic, FaHeart, FaFire, FaStar } from "react-icons/fa"
import { IoMusicalNotes } from "react-icons/io5"
import toast from "react-hot-toast"

export default function Comments({ params }: CommentsCompTypes) {
    const commentsContainerRef = useRef<HTMLDivElement>(null)
    const [comment, setComment] = useState<string>('')
    const [inputFocused, setInputFocused] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [selectedEmoji, setSelectedEmoji] = useState("")
    
    const userContext = useUser()
    const { setIsLoginOpen } = useGeneralStore()
    const { commentsByPost, setCommentsByPost, getCommentsByPostId } = useCommentStore()
    
    // Local state for comments for this specific post
    const [postComments, setPostComments] = useState<CommentWithProfile[]>([])

    const musicEmojis = [
        { icon: <FaMusic className="text-[#20DDBB]" />, text: "🎵" },
        { icon: <IoMusicalNotes className="text-[#20DDBB]" />, text: "🎶" },
        { icon: <FaHeart className="text-[#FF69B4]" />, text: "💖" },
        { icon: <FaFire className="text-[#FF4500]" />, text: "🔥" },
        { icon: <FaStar className="text-[#FFD700]" />, text: "⭐" },
    ]

    useEffect(() => {
        if (!params) return;
        
        const loadComments = async () => {
            await setCommentsByPost(params.postId)
            setPostComments(getCommentsByPostId(params.postId))
        }
        
        loadComments()
    }, [params?.postId])

    const addComment = async () => {
        if (!userContext?.user) return setIsLoginOpen(true)
        if (!comment.trim() || !params?.postId) return

        try {
            setIsSubmitting(true)
            await useCreateComment(
                userContext?.user?.id || '', 
                params.postId, 
                replyTo ? `@${replyTo.name} ${comment}` : comment
            )
            await setCommentsByPost(params.postId)
            // Update local comments state
            setPostComments(getCommentsByPostId(params.postId))
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
        if (!confirm('Are you sure you want to delete this comment?') || !params?.postId) return

        try {
            setIsDeleting(commentId)
            await useDeleteComment(commentId)
            await setCommentsByPost(params.postId)
            // Update local comments state
            setPostComments(getCommentsByPostId(params.postId))
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

    const addEmoji = (emojiText: string) => {
        setComment(prev => prev + emojiText)
        setShowEmojiPicker(false)
    }

    return (
        <div className="relative flex flex-col h-full">
            {/* Comments Header */}
            <div className="sticky top-0 z-10 bg-[#24183D] p-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Comments
                </h2>
            </div>

            {/* Comments List */}
            <div 
                ref={commentsContainerRef}
                className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#2E2469] scrollbar-track-transparent"
                style={{ maxHeight: 'calc(80vh - 180px)' }}
            >
                <div className="p-[5px] sm:p-4 space-y-4">
                    {postComments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 group animate-fadeIn">
                            <Link href={`/profile/${comment.profile.user_id}`}>
                                <img 
                                    className="w-10 h-10 rounded-full object-cover ring-2 ring-[#2E2469] hover:ring-[#20DDBB] transition-all"
                                    src={useCreateBucketUrl(comment.profile.image) || '/images/placeholders/user-placeholder.svg'}
                                    alt={comment.profile.name || 'User'}
                                />
                            </Link>
                            <div className="flex-1">
                                <div className="bg-[#282040] rounded-2xl p-3 transition-all hover:bg-[#352B5A]">
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
                                                className="text-white hover:text-[#20DDBB] transition-colors p-1 rounded-lg hover:bg-[#2E2469]/50"
                                            >
                                                <BsReply size={16} />
                                            </button>
                                            {userContext?.user?.id === comment.profile.user_id && (
                                                <button
                                                    onClick={() => deleteComment(comment.id)}
                                                    disabled={isDeleting === comment.id}
                                                    className="text-white hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-[#2E2469]/50"
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
                                    <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">
                                        {comment.text}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Comment Input */}
            <div className="sticky bottom-0 bg-[#24183D] px-[5px] sm:px-4 py-4">
                {replyTo && (
                    <div className="flex items-center justify-between mb-2 px-3 py-2 bg-[#282040] rounded-lg animate-fadeIn">
                        <span className="text-sm text-[#818BAC] flex items-center gap-2">
                            <BsReply className="text-[#20DDBB]" />
                            Replying to <span className="text-[#20DDBB]">@{replyTo.name}</span>
                        </span>
                        <button 
                            onClick={() => setReplyTo(null)}
                            className="text-[#818BAC] hover:text-white transition-colors p-1 rounded-full hover:bg-[#2E2469]/50"
                        >
                            ✕
                        </button>
                    </div>
                )}
                <div 
                    className={`flex items-center gap-3 bg-[#282040] rounded-2xl p-3 transition-all w-full ${
                        inputFocused ? 'ring-2 ring-[#20DDBB]' : ''
                    }`}
                >
                    {userContext?.user?.id && (
                        <img 
                            className="w-8 h-8 rounded-full object-cover"
                            src={userContext.user.image ? useCreateBucketUrl(userContext.user.image) : '/images/placeholders/user-placeholder.svg'}
                            alt="Your profile"
                        />
                    )}
                    <div className="flex-1 relative">
                        <input 
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            onKeyDown={handleKeyPress}
                            onFocus={() => setInputFocused(true)}
                            onBlur={() => setInputFocused(false)}
                            placeholder={replyTo ? `Reply to @${replyTo.name}...` : "Add a comment..."}
                            className="w-full bg-transparent text-white placeholder-gray-400 outline-none text-sm pr-10"
                        />
                        <button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#20DDBB] transition-colors"
                        >
                            <BsEmojiSmile size={18} />
                        </button>
                        
                        {/* Emoji Picker */}
                        {showEmojiPicker && (
                            <div className="absolute bottom-full right-0 mb-2 bg-[#2E2469] rounded-xl p-2 shadow-xl animate-fadeIn">
                                <div className="flex gap-2">
                                    {musicEmojis.map((emoji, index) => (
                                        <button
                                            key={index}
                                            onClick={() => addEmoji(emoji.text)}
                                            className="p-2 hover:bg-[#352B5A] rounded-lg transition-colors"
                                        >
                                            {emoji.icon}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
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
