import React from 'react';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaSpinner } from 'react-icons/fa';

interface TransactionStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  withAnimation?: boolean;
  withIcon?: boolean;
  className?: string;
}

export default function TransactionStatusBadge({
  status,
  size = 'md',
  withAnimation = true,
  withIcon = true,
  className = ''
}: TransactionStatusBadgeProps) {
  // Normalize status for consistent styling and comparisons
  const normalizedStatus = status.toLowerCase();
  
  // Define status types
  const isApproved = ['approved', 'completed', 'success', 'successful'].includes(normalizedStatus);
  const isRejected = ['rejected', 'failed', 'declined', 'error', 'cancelled'].includes(normalizedStatus);
  const isPending = ['pending', 'processing', 'in_progress', 'waiting'].includes(normalizedStatus);
  
  // Define color schemes based on status
  const bgColor = isApproved 
    ? 'bg-emerald-500/15 backdrop-blur-sm border-emerald-500/30' 
    : isRejected 
      ? 'bg-red-500/15 backdrop-blur-sm border-red-500/30' 
      : 'bg-amber-500/15 backdrop-blur-sm border-amber-500/30';
  
  const textColor = isApproved 
    ? 'text-emerald-400' 
    : isRejected 
      ? 'text-red-400' 
      : 'text-amber-400';
  
  // Define sizes
  const sizeClasses = {
    sm: 'text-xs py-0.5 px-2 rounded-md',
    md: 'text-sm py-1 px-2.5 rounded-lg',
    lg: 'text-base py-1.5 px-3 rounded-lg'
  };
  
  // Get icon based on status
  const getIcon = () => {
    if (isApproved) return <FaCheckCircle className="mr-1" />;
    if (isRejected) return <FaTimesCircle className="mr-1" />;
    if (isPending) return <FaHourglassHalf className="mr-1" />;
    return <FaSpinner className="mr-1 animate-spin" />;
  };
  
  // Format status text
  const getFormattedStatus = () => {
    if (isApproved) return 'Approved';
    if (isRejected) return 'Rejected';
    if (isPending) return 'Pending';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };
  
  // Define animation variants
  const badgeVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { duration: 0.2 } },
  };
  
  // Shimmer animation styling for pending status
  const shimmerAnimation = isPending && withAnimation ? 
    'after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:animate-shimmer after:translate-x-[-100%]' : '';
  
  return (
    <motion.span
      initial={withAnimation ? 'initial' : undefined}
      animate={withAnimation ? 'animate' : undefined}
      variants={badgeVariants}
      className={`
        relative overflow-hidden inline-flex items-center font-medium border
        ${bgColor} ${textColor} ${sizeClasses[size]} ${shimmerAnimation} ${className}
      `}
    >
      {withIcon && getIcon()}
      {getFormattedStatus()}
    </motion.span>
  );
} 