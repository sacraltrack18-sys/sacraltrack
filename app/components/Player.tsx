// Player.tsx
import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface PlayerProps {
  audioUrl: string;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
}

const Player: React.FC<PlayerProps> = ({ audioUrl, isPlaying, onPlay, onPause }) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const [wavesurfer, setWaveSurfer] = useState<WaveSurfer | null>(null);

  useEffect(() => {
    const wsInstance = WaveSurfer.create({
      container: waveformRef.current!,
      waveColor: '#ddd',
      progressColor: '#4A90E2',
      barHeight: 1,
      cursorColor: '#4A90E2',
      height: 80,
      normalize: true,
    });
    
    setWaveSurfer(wsInstance);

    // Clean up on unmount
    return () => {
      wsInstance.destroy();
    };
  }, []);

  useEffect(() => {
    if (wavesurfer) {
      wavesurfer.load(audioUrl);
      // Load the audio file only once, when audioUrl changes
    }
  }, [wavesurfer, audioUrl]);

  useEffect(() => {
    if (wavesurfer) {
      if (isPlaying) {
        wavesurfer.play();
        onPlay(); // Call onPlay when audio is played
      } else {
        wavesurfer.pause();
        onPause(); // Call onPause when audio is paused
      }
    }
  }, [isPlaying, wavesurfer, onPlay, onPause]);

  return <div ref={waveformRef} className="wavesurfer-container" />;
};

export default Player;



