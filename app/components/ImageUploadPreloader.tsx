import UniversalLoader from './ui/UniversalLoader';

export const ImageUploadPreloader = () => {
    return (
        <div className="flex flex-col items-center justify-center w-full h-[200px] bg-[#1E2136] rounded-xl">
            <UniversalLoader 
                size="lg" 
                variant="spinner" 
                message="Optimizing image..."
            />
        </div>
    );
}; 