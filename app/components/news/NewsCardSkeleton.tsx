import React from 'react';
import UniversalSkeleton from '../ui/UniversalSkeleton';

const NewsCardSkeleton: React.FC = () => {
    return (
        <div className="mb-6 w-full">
            <UniversalSkeleton variant="news" height="280px" />
        </div>
    );
};

export default NewsCardSkeleton; 