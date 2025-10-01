"use client";

import { lazy, Suspense } from 'react';

// Lazy loading для AudioPlayer - самый тяжелый компонент
const AudioPlayer = lazy(() => import('@/app/components/AudioPlayer'));

interface LazyAudioPlayerProps {
  m3u8Url: string;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
}

// Loading fallback для AudioPlayer
function AudioPlayerSkeleton() {
  return (
    <div className="w-full h-16 bg-gradient-to-r from-purple-900/20 to-teal-900/20 rounded-2xl border border-white/10 animate-pulse">
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white/10 rounded-full"></div>
          <div className="w-24 h-4 bg-white/10 rounded"></div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-white/10 rounded"></div>
          <div className="w-6 h-6 bg-white/10 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export default function LazyAudioPlayer(props: LazyAudioPlayerProps) {
  return (
    <Suspense fallback={<AudioPlayerSkeleton />}>
      <AudioPlayer {...props} />
    </Suspense>
  );
}
