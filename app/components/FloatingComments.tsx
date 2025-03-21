import { useState, useEffect } from 'react'
// import { CommentWithProfile } from '@/app/types'
import useCreateBucketUrl from '@/app/hooks/useCreateBucketUrl'
import moment from 'moment'

interface CommentWithProfile {
  id: string;
  text: string;
  created_at: string;
  profile: {
    user_id: string;
    name: string;
    image: string;
  };
}

interface FloatingCommentsProps {
    comments: CommentWithProfile[]
    onClick?: () => void
}

const FloatingComment = ({ comment, index }: { comment: CommentWithProfile; index: number }) => (
    <div 
        className={`absolute left-8 glass-effect rounded-xl p-3 shadow-lg
                   animate-floatComment opacity-0 max-w-[300px]`}
        style={{
            animationDelay: `${index * 2}s`,
            bottom: `${20 + (index * 5)}%`,
            animationDuration: '8s'
        }}
    >
        <div className="flex items-center gap-2">
            <img 
                src={useCreateBucketUrl(comment.profile.image) || '/images/placeholder-user.jpg'}
                alt={comment.profile.name}
                className="w-8 h-8 rounded-full ring-2 ring-[#20DDBB] animate-glow"
            />
            <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                    {comment.profile.name}
                </p>
                <p className="text-[#818BAC] text-xs">
                    {moment(comment.created_at).fromNow()}
                </p>
            </div>
        </div>
        <p className="text-white text-sm mt-2 line-clamp-2">
            {comment.text}
        </p>
    </div>
)

export default function FloatingComments({ comments, onClick }: FloatingCommentsProps) {
    const [visibleComments, setVisibleComments] = useState<CommentWithProfile[]>([])
    
    useEffect(() => {
        if (!comments.length) return
        
        // Take last 3 comments
        const lastComments = comments.slice(-3).reverse()
        setVisibleComments(lastComments)

        // Rotate comments every 8 seconds
        const interval = setInterval(() => {
            setVisibleComments(prev => {
                const newComments = [...comments]
                const lastComment = newComments.pop()
                if (lastComment) {
                    newComments.unshift(lastComment)
                }
                return newComments.slice(-3).reverse()
            })
        }, 8000)

        return () => clearInterval(interval)
    }, [comments])

    return (
        <div className={`absolute inset-0 ${onClick ? 'cursor-pointer' : 'pointer-events-none'}`} onClick={onClick}>
            {visibleComments.map((comment, index) => (
                <FloatingComment 
                    key={`${comment.id}-${index}`}
                    comment={comment} 
                    index={index}
                />
            ))}
        </div>
    )
} 