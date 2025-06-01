import React from 'react';

const UserCardSkeleton = () => {
    return (
        <div className="aspect-[3/4] min-h-[360px] max-h-[480px] rounded-2xl bg-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1E1A36] via-[#20DDBB]/5 to-[#2A2151]">
                <div className="absolute inset-0 backdrop-blur-xl" />
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute top-4 left-4 h-6 w-24 bg-gradient-to-r from-[#20DDBB]/20 to-transparent rounded-full" />
            <div className="absolute bottom-4 right-4 h-8 w-8 rounded-full bg-gradient-to-br from-[#20DDBB]/30 to-transparent" />
            
            {/* Glass Effect Lines */}
            <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-[#20DDBB]/20 to-transparent transform -skew-x-45" />
            <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-transparent via-[#20DDBB]/10 to-transparent transform skew-x-45" />
            
            {/* Content Skeleton */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="space-y-2">
                    <div className="h-4 w-2/3 bg-white/10 rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
                </div>
                <div className="mt-4 flex items-center justify-between">
                    <div className="flex space-x-2">
                        <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
                        <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
                </div>
            </div>
        </div>
    );
};

export default UserCardSkeleton; 