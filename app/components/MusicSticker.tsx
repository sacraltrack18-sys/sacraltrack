import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export interface MusicStickerProps {
  imageUrl: string;
  audioUrl: string;
  size?: number;
  animationType?: 'bounce' | 'pulse' | 'shake' | 'rotate';
  autoPlay?: boolean;
}

const animations = {
  bounce: {
    y: [0, -15, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity
    }
  },
  pulse: {
    scale: [1, 1.1, 1],
    transition: {
      duration: 0.7,
      repeat: Infinity
    }
  },
  shake: {
    x: [0, -5, 5, -5, 5, 0],
    transition: {
      duration: 0.5,
      repeat: Infinity
    }
  },
  rotate: {
    rotate: [0, 10, -10, 10, -10, 0],
    transition: {
      duration: 0.8,
      repeat: Infinity
    }
  }
};

export const MusicSticker: React.FC<MusicStickerProps> = ({
  imageUrl,
  audioUrl,
  size = 120,
  animationType = 'pulse',
  autoPlay = false
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (autoPlay && audioRef.current) {
      audioRef.current.play();
    }
  }, [autoPlay]);

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const audioElement = audioRef.current;
    
    const handleEnded = () => {
      setIsPlaying(false);
    };

    if (audioElement) {
      audioElement.addEventListener('ended', handleEnded);
    }

    return () => {
      if (audioElement) {
        audioElement.removeEventListener('ended', handleEnded);
      }
    };
  }, []);

  return (
    <div className="relative inline-block">
      <motion.div
        animate={isPlaying ? animations[animationType] : {}}
        className="cursor-pointer relative"
        onClick={toggleAudio}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden'
        }}
      >
        <Image
          src={imageUrl}
          alt="Music Sticker"
          width={size}
          height={size}
          style={{ objectFit: 'cover' }}
        />
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black bg-opacity-20 rounded-full" />
            <div className="z-10 flex space-x-1">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-6 bg-white rounded-full"
                  animate={{
                    height: [6, 16, 6],
                    transition: {
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.1
                    }
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
    </div>
  );
};

export default MusicSticker; 