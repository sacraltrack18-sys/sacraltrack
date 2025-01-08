import React, { useRef } from 'react';
import { BiPlay, BiPause } from 'react-icons/bi'; // Импортируем иконки

interface CustomAudioPlayerProps {
    src: string;
}

const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({ src }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = React.useState<boolean>(false);

    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <div className="flex items-center">
            <button onClick={togglePlayPause} className="bg-[#5A86F8] hover:bg-[#486dcb] rounded-2xl p-4 cursor-pointer">
                {isPlaying ? (
                    <BiPause size={24} color="white" /> // Иконка 'Pause'
                ) : (
                    <BiPlay size={24} color="white" /> // Иконка 'Play'
                )}
            </button>
            <audio ref={audioRef} src={src} />
        </div>
    );
};

export default CustomAudioPlayer;
