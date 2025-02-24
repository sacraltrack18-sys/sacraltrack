export const AudioUploadPreloader = () => {
    return (
        <div className="flex flex-col items-center justify-center w-full h-[200px] bg-[#1E2136] rounded-xl">
            <div className="animate-pulse flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-t-[#20DDBB] border-r-[#20DDBB] border-b-[#1E2136] border-l-[#1E2136] rounded-full animate-spin"></div>
                <p className="mt-4 text-[#818BAC] text-sm">Processing audio file...</p>
            </div>
        </div>
    );
}; 