"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useSpring } from 'framer-motion';
import { useVibeStore } from '@/app/stores/vibeStore';
import { useUser } from '@/app/context/user';
import { useGeneralStore } from '@/app/stores/general';
import Webcam from 'react-webcam';
import useDeviceDetect from '@/app/hooks/useDeviceDetect';
import useImageOptimizer from '@/app/hooks/useImageOptimizer';
import useGeolocation from '@/app/hooks/useGeolocation';
import Image from 'next/image';
import { 
  XMarkIcon, 
  PhotoIcon, 
  VideoCameraIcon, 
  FaceSmileIcon,
  CameraIcon,
  ArrowUpTrayIcon,
  SparklesIcon,
  MapPinIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  MusicalNoteIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Кастомная функция для музыкальных тостов
const musicToast = {
  success: (message: string) => {
    toast.success(message, {
      style: {
        background: 'linear-gradient(to right, #2A2151, #1E1A36)',
        color: '#fff',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 12px rgba(88, 28, 135, 0.15)',
        padding: '12px 16px',
        borderRadius: '12px',
      },
      icon: '🎵',
    });
  },
  error: (message: string) => {
    toast.error(message, {
      style: {
        background: 'linear-gradient(to right, #2A2151, #1E1A36)',
        color: '#fff',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 12px rgba(88, 28, 135, 0.15)',
        padding: '12px 16px',
        borderRadius: '12px',
      },
      icon: '🎤',
    });
  },
  info: (message: string) => {
    toast(message, {
      style: {
        background: 'linear-gradient(to right, #2A2151, #1E1A36)',
        color: '#fff',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 12px rgba(88, 28, 135, 0.15)',
        padding: '12px 16px',
        borderRadius: '12px',
      },
      icon: '🎧',
    });
  },
};

type VibeType = 'photo' | 'video' | 'sticker';
type MoodType = 'Happy' | 'Excited' | 'Chill' | 'Creative' | 'Inspired' | 'Focused' | 'Relaxed' | '';
const VIBE_PHOTO_WIDTH = 450;
const VIBE_PHOTO_HEIGHT = 560;
const ASPECT_RATIO = VIBE_PHOTO_WIDTH / VIBE_PHOTO_HEIGHT;

interface VibeUploaderProps {
  onClose: () => void;
  onSuccess?: (vibeId: string) => void;
}

const TabButton: React.FC<{
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ active, icon, label, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`flex flex-col items-center py-3 px-5 rounded-lg transition-all ${
      active 
        ? 'bg-gradient-to-r from-purple-600/90 to-pink-600/90 text-white shadow-lg shadow-purple-600/20' 
        : 'bg-white/5 text-gray-300 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20'
    }`}
  >
    <div className="mb-1">{icon}</div>
    <span className="text-xs font-medium">{label}</span>
  </motion.button>
);

const MoodChip: React.FC<{
  mood: MoodType;
  selectedMood: MoodType;
  setSelectedMood: (mood: MoodType) => void;
}> = ({ mood, selectedMood, setSelectedMood }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => setSelectedMood(mood === selectedMood ? '' : mood)}
    className={`px-4 py-2 rounded-full text-xs font-medium transition-all border ${
      mood === selectedMood
        ? 'bg-gradient-to-r from-purple-600/90 to-pink-600/90 text-white border-transparent shadow-lg shadow-purple-600/20'
        : 'bg-white/5 text-gray-300 border-white/10 hover:border-white/30 backdrop-blur-sm'
    }`}
  >
    {mood}
  </motion.button>
);

export const VibeUploader: React.FC<VibeUploaderProps> = ({ onClose, onSuccess }) => {
  const { user } = useUser() || { user: null };
  const { createVibePost, isCreatingVibe } = useVibeStore();
  const { setIsLoginOpen } = useGeneralStore();
  const { isMobile } = useDeviceDetect();
  const { optimizeImage } = useImageOptimizer();
  const { getCurrentLocation, locationName, isLoading: isLoadingLocation } = useGeolocation();
  
  const [selectedTab, setSelectedTab] = useState<VibeType>('photo');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodType>('');
  const [hasCamera, setHasCamera] = useState(false);
  const [useCameraMode, setUseCameraMode] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const [cameraPermissionChecked, setCameraPermissionChecked] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const formRef = useRef<HTMLDivElement>(null);
  
  // Check if camera is available only when needed
  const checkCameraAvailability = useCallback(() => {
    if (!cameraPermissionChecked && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
          setHasCamera(true);
          setCameraPermissionChecked(true);
        })
        .catch(() => {
          setHasCamera(false);
          setCameraPermissionChecked(true);
        });
    }
  }, [cameraPermissionChecked]);

  // Автоматически заполнить местоположение при открытии
  useEffect(() => {
    const detectLocation = async () => {
      try {
        setIsDetectingLocation(true);
        const placeName = await getCurrentLocation();
        if (placeName) {
          setLocation(placeName);
          musicToast.success('Location detected - your music scene is set!');
        }
      } catch (error) {
        console.log('Failed to detect location', error);
      } finally {
        setIsDetectingLocation(false);
      }
    };

    // Запускаем определение местоположения с небольшой задержкой
    const timer = setTimeout(() => {
      detectLocation();
    }, 500);

    return () => clearTimeout(timer);
  }, []);
  
  const handleTabChange = (tab: VibeType) => {
    setSelectedTab(tab);
    setPhotoFile(null);
    setPhotoPreview(null);
    setUseCameraMode(false);
  };
  
  const processAndOptimizeImage = async (file: File) => {
    try {
      setIsOptimizingImage(true);
      
      // Оптимизация с заданным соотношением сторон и размерами
      const optimizedFile = await optimizeImage(file, {
        maxWidth: VIBE_PHOTO_WIDTH,
        maxHeight: VIBE_PHOTO_HEIGHT,
        aspectRatio: ASPECT_RATIO,
        quality: 0.85,
        format: 'jpeg'
      });
      
      // Создаем URL для предпросмотра
      const previewUrl = URL.createObjectURL(optimizedFile);
      
      setPhotoFile(optimizedFile);
      setPhotoPreview(previewUrl);
      
      musicToast.success('Image tuned to perfect harmony');
      return optimizedFile;
    } catch (error) {
      console.error('Failed to optimize image:', error);
      musicToast.error('Hit a wrong note optimizing image');
      
      // Если оптимизация не удалась, используем оригинальный файл
      const previewUrl = URL.createObjectURL(file);
      setPhotoFile(file);
      setPhotoPreview(previewUrl);
      
      return file;
    } finally {
      setIsOptimizingImage(false);
    }
  };
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type for the selected tab
    if (selectedTab === 'photo' && !file.type.includes('image/')) {
      musicToast.error('Please select an image file');
      return;
    } else if (selectedTab === 'video' && !file.type.includes('video/')) {
      musicToast.error('Please select a video file');
      return;
    }
    
    // Процесс оптимизации изображения
    await processAndOptimizeImage(file);
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  const handleCapturePhoto = useCallback(async () => {
    if (!webcamRef.current) return;
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;
    
    // Временно устанавливаем превью, чтобы показать пользователю что фото сделано
    setPhotoPreview(imageSrc);
    
    // Convert base64 to file
    try {
      const res = await fetch(imageSrc);
      const blob = await res.blob();
      const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
      
      // Оптимизируем полученное изображение
      await processAndOptimizeImage(file);
    } catch (error) {
      console.error('Error converting webcam image:', error);
      musicToast.error('Failed to process captured image');
    }
      
  }, [webcamRef]);
  
  const handleDetectLocation = async () => {
    try {
      setIsDetectingLocation(true);
      const placeName = await getCurrentLocation();
      if (placeName) {
        setLocation(placeName);
        musicToast.success('Location detected - your music scene is set!');
      }
    } catch (error) {
      musicToast.error('Couldn\'t find your venue location');
      console.error('Error detecting location:', error);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!user || !user.id) {
        musicToast.error('Необходимо войти в систему для публикации вайба!');
        console.error('Пользователь не авторизован:', user);
        return;
      }

      if (selectedTab === 'photo' && !photoFile && !caption.trim()) {
        musicToast.error('Пожалуйста, добавьте фото или напишите текст для вайба!');
        return;
      }

      console.log('Начало публикации вайба:', {
        userObject: user ? 'доступен' : 'недоступен',
        userId: user?.id,
        photoFile: photoFile ? 'выбрано' : 'не выбрано',
        caption: caption ? 'заполнено' : 'пустое'
      });

      let vibeId;
      
      if (selectedTab === 'photo') {
        // Убедимся, что у нас есть ID пользователя
        if (!user.id) {
          musicToast.error('Не удалось определить ваш ID пользователя. Пожалуйста, войдите снова.');
          console.error('ID пользователя отсутствует в объекте user:', user);
          return;
        }
        
        console.log('Подготавливаем данные для вайба:', {
          user_id: user.id,
          type: selectedTab,
          photo_size: photoFile ? `${photoFile.size} bytes` : 'no photo',
          caption_length: caption ? caption.length : 0,
          mood: selectedMood,
          location: location ? 'set' : 'not set'
        });
        
        try {
          vibeId = await createVibePost({
            user_id: user.id,
            type: selectedTab,
            media: photoFile || undefined,
            caption,
            mood: selectedMood,
            location,
            tags: [],
          });
          
          console.log('Вайб успешно создан с ID:', vibeId);
          musicToast.success('Ваш музыкальный вайб опубликован! 🎵');
          if (onSuccess) onSuccess(vibeId);
          onClose();
        } catch (createError: any) {
          console.error('Детализированная ошибка при создании вайба:', {
            message: createError?.message,
            code: createError?.code,
            response: createError?.response,
            stack: createError?.stack
          });
          
          // Проверяем специфические типы ошибок для более информативных сообщений
          if (createError?.message?.includes('storage')) {
            musicToast.error('Не удалось загрузить фото. Проверьте размер и формат файла.');
          } else if (createError?.message?.includes('permission') || createError?.code === 401) {
            musicToast.error('У вас нет прав для создания вайба. Попробуйте выйти и войти снова.');
          } else if (createError?.message?.includes('collection')) {
            musicToast.error('Ошибка с коллекцией вайбов. Пожалуйста, обратитесь к администратору.');
            console.error('Ошибка с коллекцией вайбов. Проверьте переменные окружения и ID коллекций.');
          } else if (createError?.message?.includes('database')) {
            musicToast.error('Ошибка базы данных. Пожалуйста, обратитесь к администратору.');
            console.error('Ошибка базы данных. Проверьте переменные окружения и ID базы данных.');
          } else {
            musicToast.error('Не удалось опубликовать вайб. Пожалуйста, попробуйте позже.');
          }
        }
      } else if (selectedTab === 'video') {
        musicToast.info('Функция видео вайбов появится скоро! Следите за обновлениями!');
      } else if (selectedTab === 'sticker') {
        musicToast.info('Функция стикер-вайбов в разработке - мы трудимся над ней!');
      }
    } catch (error) {
      console.error('Общая ошибка при публикации вайба:', error);
      musicToast.error('Ваш музыкальный шедевр не удалось опубликовать. Давайте попробуем еще раз!');
    }
  };
  
  const renderTabContent = () => {
    switch (selectedTab) {
      case 'photo':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {photoPreview ? (
              <div className="relative mb-6">
                <div className="relative w-full rounded-xl overflow-hidden shadow-lg shadow-purple-600/10 bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-white/10">
                  <div className="relative w-full" style={{ height: `${VIBE_PHOTO_HEIGHT}px`, maxWidth: `${VIBE_PHOTO_WIDTH}px`, margin: '0 auto' }}>
                    <Image 
                      src={photoPreview} 
                      alt="Preview" 
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="absolute top-2 right-2 flex space-x-2">
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(null);
                        setUseCameraMode(false);
                      }}
                      className="p-2 bg-black/50 backdrop-blur-sm rounded-full text-white"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </motion.button>
                  </div>
                </div>
              </div>
            ) : useCameraMode ? (
              <div className="relative mb-6">
                <div className="relative w-full rounded-xl overflow-hidden shadow-lg shadow-purple-600/10 border border-white/10">
                  <div className="relative w-full" style={{ height: `${VIBE_PHOTO_HEIGHT}px`, maxWidth: `${VIBE_PHOTO_WIDTH}px`, margin: '0 auto' }}>
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      className="w-full h-full object-cover"
                      videoConstraints={{
                        facingMode: isMobile ? "user" : "environment",
                        width: VIBE_PHOTO_WIDTH,
                        height: VIBE_PHOTO_HEIGHT,
                        aspectRatio: ASPECT_RATIO
                      }}
                    />
                  </div>
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleCapturePhoto}
                      className="p-4 bg-white rounded-full shadow-lg shadow-purple-600/20"
                    >
                      <div className="w-8 h-8 rounded-full border-4 border-purple-600" />
                    </motion.button>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setUseCameraMode(false)}
                    className="absolute top-3 right-3 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <motion.div 
                  whileHover={{ borderColor: 'rgba(168, 85, 247, 0.5)' }}
                  onClick={triggerFileInput} 
                  className="w-full rounded-xl border-2 border-dashed border-purple-500/20 flex flex-col items-center justify-center cursor-pointer transition-all p-8 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm shadow-lg"
                  style={{ height: `${VIBE_PHOTO_HEIGHT * 0.7}px`, maxWidth: `${VIBE_PHOTO_WIDTH}px`, margin: '0 auto' }}
                >
                  <motion.div
                    animate={{ 
                      y: [0, -10, 0],
                      opacity: [1, 0.8, 1] 
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 3,
                      ease: "easeInOut" 
                    }}
                  >
                    <div className="relative">
                      <PhotoIcon className="h-20 w-20 text-purple-500/60 mb-6" />
                      <MusicalNoteIcon className="h-8 w-8 text-pink-500/80 absolute -top-2 -right-2" />
                    </div>
                  </motion.div>
                  <p className="text-white text-center text-lg mb-2 font-medium">Share your musical moment</p>
                  <p className="text-gray-400 text-center mb-4">Upload or capture your performance, gear, or inspiration</p>
                  <p className="text-xs text-gray-500 max-w-xs text-center">
                    Show us your instruments, studio setup, concert photos, or anything that represents your musical journey. Your photo will be optimized to <span className="text-purple-400">{VIBE_PHOTO_WIDTH}x{VIBE_PHOTO_HEIGHT}</span>.
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                  />
                </motion.div>
                
                {hasCamera && (
                  <div className="mt-6 flex justify-center">
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: "0 8px 20px rgba(167, 139, 250, 0.3)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        checkCameraAvailability();
                        if (hasCamera) {
                          setUseCameraMode(true);
                        } else {
                          musicToast.info('Please allow camera access to use this feature');
                        }
                      }}
                      className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-lg shadow-purple-600/20"
                    >
                      <CameraIcon className="h-5 w-5 mr-2" />
                      {isMobile ? "Take a Selfie" : "Use Camera"}
                    </motion.button>
                  </div>
                )}
              </div>
            )}
            
            <div ref={formRef} className="space-y-6 px-1">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <label htmlFor="caption" className="block text-sm font-medium text-white mb-2">
                  Caption
                </label>
                <textarea
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Share your musical thoughts, inspirations, or what this track means to you..."
                  className="w-full bg-white/5 text-white placeholder-gray-400 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px] border border-white/10 backdrop-blur-sm"
                />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <label htmlFor="mood" className="block text-sm font-medium text-white mb-3">
                  Mood
                </label>
                <div className="flex flex-wrap gap-2">
                  <MoodChip mood="Happy" selectedMood={selectedMood} setSelectedMood={setSelectedMood} />
                  <MoodChip mood="Excited" selectedMood={selectedMood} setSelectedMood={setSelectedMood} />
                  <MoodChip mood="Chill" selectedMood={selectedMood} setSelectedMood={setSelectedMood} />
                  <MoodChip mood="Creative" selectedMood={selectedMood} setSelectedMood={setSelectedMood} />
                  <MoodChip mood="Inspired" selectedMood={selectedMood} setSelectedMood={setSelectedMood} />
                  <MoodChip mood="Focused" selectedMood={selectedMood} setSelectedMood={setSelectedMood} />
                  <MoodChip mood="Relaxed" selectedMood={selectedMood} setSelectedMood={setSelectedMood} />
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="relative"
              >
                <label htmlFor="location" className="block text-sm font-medium text-white mb-2">
                  Location
                </label>
                <div className="relative">
                  <input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Add your location"
                    className="w-full bg-white/5 text-white placeholder-gray-400 rounded-xl p-4 pl-10 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-white/10 backdrop-blur-sm"
                  />
                  <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleDetectLocation}
                    disabled={isDetectingLocation}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {isDetectingLocation ? (
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    ) : (
                      <AdjustmentsHorizontalIcon className="h-5 w-5" />
                    )}
                  </motion.button>
                </div>
                {isDetectingLocation && (
                  <p className="text-xs text-purple-400 mt-1 animate-pulse">Detecting your location...</p>
                )}
              </motion.div>
            </div>
          </motion.div>
        );
      
      case 'video':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="py-12 px-4"
          >
            <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl p-8 text-center shadow-lg border border-white/10">
              <VideoCameraIcon className="h-16 w-16 text-purple-500/60 mx-auto mb-6" />
              <h3 className="text-white text-xl font-semibold mb-4">Music Video Vibes Coming Soon</h3>
              <p className="text-gray-300 mb-6 max-w-sm mx-auto">
                We're composing the ability for you to share performance videos, music clips, and instrumental showcases.
                Stay tuned for the next track!
              </p>
              <div className="inline-flex items-center text-purple-400 bg-white/5 px-5 py-3 rounded-full">
                <SparklesIcon className="h-5 w-5 mr-2" />
                <span>Coming Soon</span>
              </div>
            </div>
          </motion.div>
        );
      
      case 'sticker':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="py-12 px-4"
          >
            <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl p-8 text-center shadow-lg border border-white/10">
              <FaceSmileIcon className="h-16 w-16 text-purple-500/60 mx-auto mb-6" />
              <h3 className="text-white text-xl font-semibold mb-4">Musical Sticker Vibes Coming Soon</h3>
              <p className="text-gray-300 mb-6 max-w-sm mx-auto">
                Express your musical emotions with animated stickers - from guitar riffs to drum solos.
                Our audio engineers are fine-tuning this feature!
              </p>
              <div className="inline-flex items-center text-purple-400 bg-white/5 px-5 py-3 rounded-full">
                <SparklesIcon className="h-5 w-5 mr-2" />
                <span>Coming Soon</span>
              </div>
            </div>
          </motion.div>
        );
      
      default:
        return null;
    }
  };
  
  if (!user) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gradient-to-br from-[#2A2151] to-[#1E1A36] rounded-2xl max-w-md w-full p-8 text-center border border-white/10 shadow-xl"
        >
          <h3 className="text-white text-2xl font-bold mb-4">Sign In Required</h3>
          <p className="text-gray-300 mb-8">
            You need to be signed in to share your vibe.
          </p>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 8px 20px rgba(167, 139, 250, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsLoginOpen(true)}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium shadow-lg shadow-purple-600/20"
          >
            Sign In
          </motion.button>
        </motion.div>
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25 }}
        className="bg-gradient-to-br from-[#2A2151]/95 to-[#1E1A36]/95 backdrop-blur-xl rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden border border-white/10 shadow-xl relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="py-5 px-6 flex items-center justify-between bg-gradient-to-r from-purple-900/20 to-pink-900/20 backdrop-blur-md border-b border-white/5"
        >
          <h3 className="text-xl font-bold text-white">Share Your Musical Vibe</h3>
          <motion.button 
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 text-gray-300 hover:text-white"
          >
            <XMarkIcon className="h-6 w-6" />
          </motion.button>
        </motion.div>
        
        {/* Music Info Block */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="px-6 py-4 bg-gradient-to-r from-purple-900/10 to-pink-900/10 border-b border-white/5"
        >
          <div className="flex items-start gap-3">
            <MusicalNoteIcon className="h-6 w-6 text-purple-400 flex-shrink-0 mt-1" />
            <p className="text-gray-300 text-sm">
              <span className="font-medium text-white">Sacral Track</span> is all about music! Share your musical vibe, showcase your art, and connect with other music lovers. Express yourself through photos, videos, or animated stickers that capture your musical journey.
            </p>
          </div>
        </motion.div>
        
        {/* Tabs */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="p-4 border-b border-white/5 bg-gradient-to-r from-purple-900/10 to-pink-900/10"
        >
          <div className="flex justify-between space-x-3">
            <TabButton 
              active={selectedTab === 'photo'} 
              icon={<PhotoIcon className="h-5 w-5" />} 
              label="Photo" 
              onClick={() => handleTabChange('photo')} 
            />
            <TabButton 
              active={selectedTab === 'video'} 
              icon={<VideoCameraIcon className="h-5 w-5" />} 
              label="Video" 
              onClick={() => handleTabChange('video')} 
            />
            <TabButton 
              active={selectedTab === 'sticker'} 
              icon={<FaceSmileIcon className="h-5 w-5" />} 
              label="Sticker" 
              onClick={() => handleTabChange('sticker')} 
            />
          </div>
        </motion.div>
        
        {/* Content */}
        <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent px-6 pt-6 pb-24" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {renderTabContent()}
        </div>
        
        {/* Fixed Publish Button */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5 bg-gradient-to-r from-[#2A2151]/95 to-[#1E1A36]/95 backdrop-blur-xl"
        >
          <div className="flex justify-between items-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="px-5 py-3 border border-white/10 text-gray-300 hover:text-white rounded-full backdrop-blur-sm"
            >
              Cancel
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 8px 20px rgba(167, 139, 250, 0.3)" }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={isCreatingVibe || (selectedTab === 'photo' && !photoFile && !caption.trim()) || isOptimizingImage}
              className={`px-6 py-3 rounded-full flex items-center shadow-lg ${
                isCreatingVibe || (selectedTab === 'photo' && !photoFile && !caption.trim()) || isOptimizingImage
                  ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-600/20'
              }`}
            >
              {isCreatingVibe ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Posting...
                </>
              ) : isOptimizingImage ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Optimizing...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  Share Your Musical Journey
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default VibeUploader; 