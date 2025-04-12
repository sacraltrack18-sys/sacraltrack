import React, { useRef } from 'react';
import { BiPlay, BiPause } from 'react-icons/bi'; // Импортируем иконки

interface CustomAudioPlayerProps {
    src: string;
}

const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({ src }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = React.useState<boolean>(false);

    const togglePlayPause = async () => {
        if (audioRef.current) {
            try {
                if (isPlaying) {
                    // Проверяем, не на паузе ли уже аудио
                    if (!audioRef.current.paused) {
                        audioRef.current.pause();
                    }
                } else {
                    // Проверяем, не воспроизводится ли уже аудио
                    if (audioRef.current.paused) {
                        const playPromise = audioRef.current.play();
                        if (playPromise !== undefined) {
                            await playPromise;
                        }
                    }
                }
                setIsPlaying(!isPlaying);
            } catch (error) {
                console.error('Error toggling audio playback:', error);
                // В случае ошибки сбрасываем состояние воспроизведения
                setIsPlaying(false);
            }
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
