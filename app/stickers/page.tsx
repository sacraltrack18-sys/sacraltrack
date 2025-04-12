'use client';

import React, { useState } from 'react';
import StickerCollection from '../components/StickerCollection';
import StickerUploader from '../components/StickerUploader';
import { MusicStickerProps } from '../components/MusicSticker';

// Демонстрационные данные для стикеров
const initialStickers: (MusicStickerProps & { id: string })[] = [
  {
    id: '1',
    imageUrl: '/stickers/dance.gif',
    audioUrl: '/sounds/notification.mp3',
    size: 120,
    animationType: 'bounce'
  },
  {
    id: '2',
    imageUrl: '/stickers/cat.gif',
    audioUrl: '/sounds/notification.mp3',
    size: 120,
    animationType: 'pulse'
  },
  {
    id: '3',
    imageUrl: '/stickers/dog.gif',
    audioUrl: '/sounds/notification.mp3',
    size: 120,
    animationType: 'shake'
  },
  {
    id: '4',
    imageUrl: '/stickers/laugh.gif',
    audioUrl: '/sounds/notification.mp3',
    size: 120,
    animationType: 'rotate'
  },
  {
    id: '5',
    imageUrl: '/stickers/party.gif',
    audioUrl: '/sounds/notification.mp3',
    size: 120,
    animationType: 'bounce'
  },
  {
    id: '6',
    imageUrl: '/stickers/music.gif',
    audioUrl: '/sounds/notification.mp3',
    size: 120,
    animationType: 'pulse'
  },
];

export default function StickersPage() {
  const [columns, setColumns] = useState(3);
  const [stickers, setStickers] = useState(initialStickers);
  const [showUploader, setShowUploader] = useState(false);
  
  const handleStickerCreated = (stickerData: {
    imageUrl: string;
    audioUrl: string;
    animationType: 'bounce' | 'pulse' | 'shake' | 'rotate';
  }) => {
    const newSticker = {
      ...stickerData,
      id: `user-${Date.now()}`,
      size: 120
    };
    
    setStickers([...stickers, newSticker]);
    setShowUploader(false);
  };
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-3xl font-bold">Музыкальные Стикеры</h1>
        
        <button
          onClick={() => setShowUploader(!showUploader)}
          className="mt-4 md:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {showUploader ? 'Скрыть форму' : 'Создать стикер'}
        </button>
      </div>
      
      {showUploader && (
        <div className="mb-8">
          <StickerUploader onStickerCreated={handleStickerCreated} />
        </div>
      )}
      
      <div className="mb-6">
        <label className="block mb-2 text-sm font-medium">
          Количество колонок: {columns}
        </label>
        <input
          type="range"
          min="1"
          max="6"
          value={columns}
          onChange={(e) => setColumns(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      
      <StickerCollection
        stickers={stickers}
        columns={columns}
        gap={16}
      />
      
      <div className="mt-10 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Примечание:</h2>
        <p>
          Для работы демонстрационных стикеров вам нужно разместить GIF-анимации в папке <code>/public/stickers/</code>. 
          В этом демо мы используем одинаковый звук для всех предустановленных стикеров.
        </p>
        <p className="mt-2">
          С помощью кнопки "Создать стикер" вы можете создать собственные стикеры, 
          загрузив GIF-анимацию и звук.
        </p>
      </div>
    </div>
  );
} 