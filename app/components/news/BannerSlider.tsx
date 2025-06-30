"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { database } from '@/libs/AppWriteClient';
import { Query, Models } from 'appwrite';
import { getAppwriteImageUrl, fixAppwriteImageUrl } from '@/app/utils/appwriteImageUrl'; 
import { useRouter } from 'next/navigation';

// Типы для баннеров
interface BannerSlide {
  $id: string;
  image_url: string;
  title: string;
  subtitle?: string;
  description?: string;
  link_url?: string;
  action_text?: string;
  bg_color?: string;
  text_color?: string;
  position: number;
}

const BannerSlider = () => {
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);
  const router = useRouter();

  // Получение баннеров из Appwrite
  const fetchBanners = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const now = new Date().toISOString();
      
      // Получаем только активные баннеры, которые должны показываться сейчас
      const response = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_BANNER_SLIDERS!,
        [
          Query.equal('is_active', true),
          Query.lessThanEqual('start_date', now),
          Query.greaterThan('end_date', now),
          Query.orderAsc('position')
        ]
      );
      
      if (response.documents.length > 0) {
        // Преобразуем документы из Appwrite в наш формат BannerSlide
        const bannerDocuments = response.documents.map(doc => ({
          $id: doc.$id,
          image_url: doc.image_url as string,
          title: doc.title as string,
          subtitle: doc.subtitle as string | undefined,
          description: doc.description as string | undefined,
          link_url: doc.link_url as string | undefined,
          action_text: doc.action_text as string | undefined,
          bg_color: doc.bg_color as string | undefined,
          text_color: doc.text_color as string | undefined,
          position: doc.position as number
        }));
        
        // Сортируем по позиции для уверенности
        bannerDocuments.sort((a, b) => a.position - b.position);
        
        setBanners(bannerDocuments);
      } else {
        // Попробуем поискать баннеры без ограничения по дате окончания
        const fallbackResponse = await database.listDocuments(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_BANNER_SLIDERS!,
          [
            Query.equal('is_active', true),
            Query.lessThanEqual('start_date', now),
            Query.orderAsc('position')
          ]
        );
        
        if (fallbackResponse.documents.length > 0) {
          // Преобразуем документы из Appwrite в наш формат BannerSlide
          const bannerDocuments = fallbackResponse.documents.map(doc => ({
            $id: doc.$id,
            image_url: doc.image_url as string,
            title: doc.title as string,
            subtitle: doc.subtitle as string | undefined,
            description: doc.description as string | undefined,
            link_url: doc.link_url as string | undefined,
            action_text: doc.action_text as string | undefined,
            bg_color: doc.bg_color as string | undefined,
            text_color: doc.text_color as string | undefined,
            position: doc.position as number
          }));
          
          // Сортируем по позиции для уверенности
          bannerDocuments.sort((a, b) => a.position - b.position);
          
          setBanners(bannerDocuments);
        } else {
          // Если нет активных баннеров, можно добавить дефолтный
          setBanners([
            {
              $id: 'default',
              image_url: '/images/Banner-news.png',
              title: 'Experience the next evolution of Sacral Track',
              description: "Experience the next evolution in music streaming with SACRAL TRACK's comprehensive platform update, designed to create deeper connections between artists and listeners through innovative features and enhanced functionality.",
              link_url: '/news/latest-update',
              action_text: 'Read More',
              position: 0
            }
          ]);
        }
      }
    } catch (err) {
      console.error('Error fetching banners:', err);
      setError('Failed to load banners');
      
      // Добавляем дефолтный баннер в случае ошибки
      setBanners([
        {
          $id: 'default',
          image_url: '/images/Banner-news.png',
          title: 'Experience the next evolution of Sacral Track',
          description: "Experience the next evolution in music streaming with SACRAL TRACK's comprehensive platform update, designed to create deeper connections between artists and listeners through innovative features and enhanced functionality.",
          link_url: '/news/latest-update',
          action_text: 'Read More',
          position: 0
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  // Автоматическая смена слайдов
  useEffect(() => {
    if (banners.length <= 1) return;
    
    const startTimer = () => {
      timerRef.current = setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
      }, 5000); // 5 секунд на слайд
    };
    
    startTimer();
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentIndex, banners.length]);

  const goToPrevious = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? banners.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrentIndex((prevIndex) => 
      (prevIndex + 1) % banners.length
    );
  };

  const goToSlide = (index: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrentIndex(index);
  };

  // Обработка свайпов на мобильных устройствах
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    
    // Если свайп был достаточно длинным (более 50px)
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Свайп влево (вперед)
        goToNext();
      } else {
        // Свайп вправо (назад)
        goToPrevious();
      }
    }
    
    touchStartX.current = null;
  };

  // Функция для открытия первой новости или перехода по ссылке баннера
  const handleReadFirstNews = () => {
    const currentBanner = banners[currentIndex];
    if (currentBanner && currentBanner.link_url) {
      router.push(currentBanner.link_url);
    } else {
      router.push('/news');
    }
  };

  if (banners.length === 0 && !isLoading) {
    return null; // Не показываем слайдер, если нет баннеров
  }

  if (isLoading) {
    return (
      <div className="w-full h-[400px] bg-[#1E1F2B] rounded-xl mb-12 animate-pulse flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div 
      className="w-full relative overflow-hidden rounded-xl mb-12 h-[400px]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence initial={false} mode="wait">
        {banners.length > 0 && (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="relative w-full h-full"
          >
            {banners[currentIndex].image_url && (
              <div className="absolute inset-0 w-full h-full">
                <Image
                  src={fixAppwriteImageUrl(getAppwriteImageUrl(banners[currentIndex].image_url))}
                  alt={banners[currentIndex].title}
                  fill
                  priority
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent"></div>
              </div>
            )}

            <div
              className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 z-10"
              style={{
                backgroundColor: banners[currentIndex].bg_color ? `${banners[currentIndex].bg_color}80` : 'transparent',
                color: banners[currentIndex].text_color || 'white'
              }}
            >
              <div className="max-w-lg">
                <h2 className="text-3xl md:text-4xl font-bold mb-3">
                  {banners[currentIndex].title}
                </h2>
                {banners[currentIndex].subtitle && (
                  <h3 className="text-xl md:text-2xl font-semibold mb-3 opacity-90">
                    {banners[currentIndex].subtitle}
                  </h3>
                )}
                {banners[currentIndex].description && (
                  <p className="text-sm md:text-base mb-6 opacity-80">
                    {banners[currentIndex].description}
                  </p>
                )}
                {banners[currentIndex].link_url && (
                  <button
                    onClick={handleReadFirstNews}
                    className="inline-block bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg backdrop-blur-md border border-white/20 glass-effect"
                    style={{
                      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.18)'
                    }}
                  >
                    {banners[currentIndex].action_text || 'Read More'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Стрелки навигации (показываем только если больше 1 баннера) */}
      {banners.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full z-20 transition-all duration-300"
            aria-label="Previous banner"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full z-20 transition-all duration-300"
            aria-label="Next banner"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Индикаторы слайдов (точки) */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentIndex 
                  ? 'bg-white scale-110' 
                  : 'bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerSlider;