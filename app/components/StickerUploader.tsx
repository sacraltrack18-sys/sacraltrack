import React, { useState, useRef, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import MusicSticker from './MusicSticker';

export interface StickerUploaderProps {
  onStickerCreated: (stickerData: {
    imageUrl: string;
    audioUrl: string;
    animationType: 'bounce' | 'pulse' | 'shake' | 'rotate';
  }) => void;
}

const StickerUploader: React.FC<StickerUploaderProps> = ({ onStickerCreated }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [animationType, setAnimationType] = useState<'bounce' | 'pulse' | 'shake' | 'rotate'>('pulse');
  const [isCreating, setIsCreating] = useState(false);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Проверка, что файл - изображение
      if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение');
        return;
      }
      
      setImageFile(file);
      
      // Создаем URL для предпросмотра
      const fileUrl = URL.createObjectURL(file);
      setImageSrc(fileUrl);
    }
  };

  const handleAudioChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Проверка, что файл - аудио
      if (!file.type.startsWith('audio/')) {
        alert('Пожалуйста, выберите аудиофайл');
        return;
      }
      
      setAudioFile(file);
      
      // Создаем URL для предпросмотра
      const fileUrl = URL.createObjectURL(file);
      setAudioSrc(fileUrl);
    }
  };

  const openImageSelector = () => {
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  };

  const openAudioSelector = () => {
    if (audioInputRef.current) {
      audioInputRef.current.click();
    }
  };

  const handleCreateSticker = () => {
    if (!imageSrc || !audioSrc) {
      alert('Пожалуйста, выберите изображение и аудио для стикера');
      return;
    }

    setIsCreating(true);
    
    // Имитация загрузки файлов на сервер
    setTimeout(() => {
      // В реальном приложении здесь был бы код для загрузки файлов на сервер
      // и получения URL-адресов загруженных файлов
      
      onStickerCreated({
        imageUrl: imageSrc,
        audioUrl: audioSrc,
        animationType: animationType
      });
      
      // Сброс формы
      setImageFile(null);
      setAudioFile(null);
      setImageSrc(null);
      setAudioSrc(null);
      setAnimationType('pulse');
      setIsCreating(false);
    }, 1500);
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Создать новый стикер</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Изображение стикера</label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <div 
              onClick={openImageSelector}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 h-48 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition"
            >
              {imageSrc ? (
                <div className="relative w-full h-full">
                  <Image
                    src={imageSrc}
                    alt="Uploaded Sticker"
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-gray-500 mb-2">
                    <svg className="mx-auto h-12 w-12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">Выберите GIF или изображение</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Звук стикера</label>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              className="hidden"
            />
            <div 
              onClick={openAudioSelector}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 h-24 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition"
            >
              {audioSrc ? (
                <div className="flex items-center w-full">
                  <svg className="h-8 w-8 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-700">{audioFile?.name || "audio.mp3"}</p>
                    <audio controls className="mt-1 w-full h-8">
                      <source src={audioSrc} type={audioFile?.type} />
                    </audio>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-gray-500 mb-2">
                    <svg className="mx-auto h-8 w-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">Выберите аудиофайл</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Тип анимации</label>
            <select
              value={animationType}
              onChange={(e) => setAnimationType(e.target.value as any)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="bounce">Подпрыгивание</option>
              <option value="pulse">Пульсация</option>
              <option value="shake">Встряхивание</option>
              <option value="rotate">Вращение</option>
            </select>
          </div>
          
          <button
            onClick={handleCreateSticker}
            disabled={!imageSrc || !audioSrc || isCreating}
            className={`w-full p-3 rounded-md font-medium text-white ${
              !imageSrc || !audioSrc || isCreating
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isCreating ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Создаем стикер...
              </span>
            ) : (
              'Создать стикер'
            )}
          </button>
        </div>
        
        <div className="flex flex-col items-center justify-center">
          <h3 className="text-lg font-medium mb-4">Предпросмотр стикера</h3>
          {imageSrc && audioSrc ? (
            <MusicSticker
              imageUrl={imageSrc}
              audioUrl={audioSrc}
              size={150}
              animationType={animationType}
            />
          ) : (
            <div className="bg-gray-200 rounded-full w-[150px] h-[150px] flex items-center justify-center">
              <p className="text-gray-500 text-center px-4">
                Загрузите изображение и звук, чтобы увидеть предпросмотр
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StickerUploader; 