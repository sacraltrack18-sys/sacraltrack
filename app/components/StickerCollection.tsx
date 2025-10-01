import React from 'react';
import MusicSticker, { MusicStickerProps } from './MusicSticker';

export interface StickerCollectionProps {
  stickers: (MusicStickerProps & { id: string })[];
  columns?: number;
  gap?: number;
}

const StickerCollection: React.FC<StickerCollectionProps> = ({
  stickers,
  columns = 3,
  gap = 16
}) => {
  return (
    <div 
      className="grid w-full"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`
      }}
    >
      {stickers.map((sticker) => (
        <div key={sticker.id} className="flex items-center justify-center">
          <MusicSticker
            imageUrl={sticker.imageUrl}
            audioUrl={sticker.audioUrl}
            size={sticker.size}
            animationType={sticker.animationType}
            autoPlay={sticker.autoPlay}
          />
        </div>
      ))}
    </div>
  );
};

export default StickerCollection; 