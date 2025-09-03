import React from 'react';
import UniversalLoader from './ui/UniversalLoader';

const Preloader = () => {
    return (
        <div className="preloader bg-[#000] items-center w-full flex flex-col justify-center h-screen">
            <UniversalLoader 
                size="xl" 
                variant="spinner" 
                message="Loading Sacral Track..."
            />
        </div>
    );
};

export default Preloader;