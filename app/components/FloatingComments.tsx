import { useState, useEffect, useRef } from 'react'
// import { CommentWithProfile } from '@/app/types'
import useCreateBucketUrl from '@/app/hooks/useCreateBucketUrl'
import moment from 'moment'
import { motion, AnimatePresence } from 'framer-motion'

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
    onClick?: (e: React.MouseEvent) => void
    onClose?: () => void
}

const FloatingComment = ({ comment, index }: { comment: CommentWithProfile; index: number }) => {
    // Proper use of the hook - at the top level of the component
    const imageUrl = useCreateBucketUrl(comment.profile.image) || '/images/placeholder-user.jpg';
    
    return (
        <motion.div 
            className="absolute left-6 md:left-8 glass-effect rounded-xl p-3 shadow-lg max-w-[270px] sm:max-w-[300px] hover:shadow-[0_8px_32px_rgba(32,221,187,0.15)]"
            initial={{ opacity: 0, x: -20 }}
            animate={{ 
                opacity: 1, 
                x: 0,
                transition: { delay: index * 0.3, duration: 0.5 }
            }}
            exit={{ opacity: 0, x: -20, transition: { duration: 0.3 } }}
            whileHover={{ 
                scale: 1.02, 
                transition: { duration: 0.2 } 
            }}
            style={{
                bottom: `${15 + (index * 10)}%`,
                zIndex: 10 - index, // So that upper comments are in the foreground
            }}
        >
            <div className="flex items-center gap-2">
                <img 
                    src={imageUrl}
                    alt={comment.profile.name}
                    className="w-8 h-8 rounded-full ring-2 ring-[#20DDBB]/70 animate-glow"
                    onError={(e) => {
                        // If the image fails to load, replace with placeholder
                        e.currentTarget.src = '/images/placeholder-user.jpg';
                    }}
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
            <p className="text-white text-sm mt-2 line-clamp-1 overflow-ellipsis">
                {comment.text}
            </p>
        </motion.div>
    )
}

export default function FloatingComments({ comments, onClick, onClose }: FloatingCommentsProps) {
    const [visibleComments, setVisibleComments] = useState<CommentWithProfile[]>([])
    const [isActive, setIsActive] = useState(true)
    const instanceIdRef = useRef(`instance-${Date.now()}`)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    
    // Clear timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
            }
        }
    }, [])
    
    // Set initial state when mounting
    useEffect(() => {
        if (!comments.length) return
        
        // Take only the last 3 comments (or fewer) for display
        const commentsToShow = comments.slice(-3).reverse()
        setVisibleComments(commentsToShow)
        
        // Set a timer to hide comments after 3 seconds
        if (timerRef.current) {
            clearTimeout(timerRef.current)
        }
        
        timerRef.current = setTimeout(() => {
            setVisibleComments([])
        }, 3000) // Hide after 3 seconds
    }, [comments])
    
    // If the user hovers over, comments should remain visible
    const handleMouseEnter = () => {
        setIsActive(false)
        // Clear the timer when user hovers
        if (timerRef.current) {
            clearTimeout(timerRef.current)
        }
    }
    
    const handleMouseLeave = () => {
        setIsActive(true)
        // Reset the timer when user stops hovering
        if (timerRef.current) {
            clearTimeout(timerRef.current)
        }
        
        timerRef.current = setTimeout(() => {
            setVisibleComments([])
        }, 3000) // Hide after 3 seconds
    }

    const handleClick = (e: React.MouseEvent) => {
        // Stop propagation to prevent the event from reaching the play button
        e.stopPropagation();
        if (onClick) onClick(e);
        if (onClose) onClose();
    };

    return (
        <div 
            className={`absolute inset-0 pointer-events-none`} 
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            data-instance-id={instanceIdRef.current}
        >
            <AnimatePresence>
                {visibleComments.map((comment, index) => (
                    <FloatingComment 
                        key={`${comment.id}-${index}-${instanceIdRef.current}`}
                        comment={comment} 
                        index={index}
                    />
                ))}
            </AnimatePresence>
            
            {/* Add styles for comment animation */}
            <style jsx global>{`
                .glass-effect {
                    background: rgba(24, 16, 48, 0.4);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    transition: all 0.3s ease;
                }
                
                .animate-glow {
                    animation: glow 2s infinite alternate;
                }
                
                @keyframes glow {
                    0% {
                        box-shadow: 0 0 3px rgba(32, 221, 187, 0.2);
                    }
                    100% {
                        box-shadow: 0 0 10px rgba(32, 221, 187, 0.4);
                    }
                }
                
                /* Additional styles for text truncation */
                .overflow-ellipsis {
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    overflow: hidden;
                }
                
                /* Enhanced blur effect for modern browsers */
                @supports (backdrop-filter: blur(12px)) {
                    .glass-effect {
                        background: rgba(24, 16, 48, 0.35);
                    }
                }
            `}</style>
        </div>
    )
} 