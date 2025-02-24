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
  const [bufferingProgress, setBufferingProgress] = useState(0);

  useEffect(() => {
    const wsInstance = WaveSurfer.create({
      container: waveformRef.current!,
      waveColor: '#ddd',
      progressColor: '#4A90E2',
      barHeight: 1,
      cursorColor: '#4A90E2',
      height: 80,
      normalize: true,
      backend: 'MediaElement', // Use MediaElement backend for better streaming support
    });

    wsInstance.on('loading', (progress) => {
      setBufferingProgress(progress);
    });

    wsInstance.on('ready', () => {
      // Waveform is ready, you could optionally show it here.
      if (isPlaying) {
        wsInstance.play();
        onPlay();
      }
    });

    wsInstance.on('error', (err) => {
        console.error('Wavesurfer error:', err);
        //Handle errors appropriately, for instance, display an error message
    });
    
    setWaveSurfer(wsInstance);

    return () => {
      wsInstance.destroy();
    };
  }, []);

  useEffect(() => {
    if (wavesurfer && audioUrl) {
      wavesurfer.load(audioUrl);
    }
  }, [wavesurfer, audioUrl]);


  useEffect(() => {
    if (wavesurfer) {
      if (isPlaying) {
        wavesurfer.play();
        onPlay();
      } else {
        wavesurfer.pause();
        onPause();
      }
    }
  }, [isPlaying, wavesurfer, onPlay, onPause]);

  return (
    <div>
      <div ref={waveformRef} className="wavesurfer-container" />
      {bufferingProgress < 100 && (
        <p>Buffering: {Math.floor(bufferingProgress * 100)}%</p>
      )}
    </div>
  );
};

export default Player;
