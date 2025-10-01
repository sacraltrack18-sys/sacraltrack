import UniversalLoader from './ui/UniversalLoader';

export const AudioUploadPreloader = () => {
    return (
        <div className="flex flex-col items-center justify-center w-full h-[200px] bg-[#1E2136] rounded-xl">
            <UniversalLoader 
                size="lg" 
                variant="wave" 
                message="Processing audio file..."
            />
        </div>
    );
}; 