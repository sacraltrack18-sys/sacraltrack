'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useMixStore } from '../stores/mixStore';
import { useUser } from '../context/user';
import MixCard from '../components/mix/MixCard';
import MixUploader from '../components/mix/MixUploader';
import Layout from '../components/Layout';
import { useInView } from 'react-intersection-observer';
import MixCardSkeleton from '../components/mix/MixCardSkeleton';
import { database, Query, APPWRITE_CONFIG } from '@/libs/AppWriteClient';
import UniversalLoader from '../components/ui/UniversalLoader';

const FilterButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    className={`
      px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 shadow-md
      ${active 
        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border border-purple-500/50 shadow-lg shadow-purple-500/20' 
        : 'bg-gradient-to-r from-gray-800/80 to-gray-900/80 text-gray-300 border border-purple-500/10 hover:border-purple-500/30 hover:text-white'}
    `}
  >
    <span className={`${active ? 'text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-100' : ''}`}>
      {children}
    </span>
  </motion.button>
);

export default function MixPage() {
  const { allMixPosts, isLoadingMixes, hasMore, fetchAllMixes, loadMoreMixes, setSelectedMixGenre, selectedMixGenre, fetchUserLikedMixes } = useMixStore();
  const userContext = useUser();
  const user = userContext?.user;
  const [showUploader, setShowUploader] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [loadMoreCount, setLoadMoreCount] = useState(0);
  const maxRetries = 3;
  const { ref, inView } = useInView();
  
  // Инициализация данных при загрузке страницы с использованием коллекции миксов
  useEffect(() => {
    const fetchMixes = async () => {
      try {
        // Используем коллекцию из .env
        const mixCollectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_MIX_POSTS || '6857da72002661f6e89b';
        
        // Проверяем, что коллекция доступна
        console.log('Using mix collection ID:', mixCollectionId);
        
        // Обновляем ID коллекции в APPWRITE_CONFIG
        if (APPWRITE_CONFIG) {
          APPWRITE_CONFIG.mixPostsCollectionId = mixCollectionId;
        }
        
        // Вызываем стандартную функцию загрузки миксов
        await fetchAllMixes();
      } catch (error) {
        console.error('Error initializing mixes:', error);
      }
    };
    
    fetchMixes();
  }, [fetchAllMixes]);
  
  // Загрузка лайкнутых миксов пользователя
  useEffect(() => {
    if (user?.id) {
      const fetchLikedMixes = async () => {
        try {
          await fetchUserLikedMixes(user.id);
        } catch (error) {
          console.error('Error fetching liked mixes:', error);
          if (retryCount < maxRetries) {
            // Экспоненциальная задержка перед повторной попыткой
            const delay = Math.pow(2, retryCount) * 1000;
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, delay);
          }
        }
      };
      
      fetchLikedMixes();
    }
  }, [user?.id, fetchUserLikedMixes, retryCount]);
  
  // Загрузка дополнительных миксов при прокрутке с ограничением на количество подгрузок
  useEffect(() => {
    if (inView && hasMore && !isLoadingMixes && loadMoreCount < maxRetries) {
      loadMoreMixes();
      setLoadMoreCount(prev => prev + 1);
    }
  }, [inView, hasMore, isLoadingMixes, loadMoreMixes, loadMoreCount, maxRetries]);
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-600 tracking-tight"
          >
            MIXES
          </motion.h1>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 10px 25px -5px rgba(124, 58, 237, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 400, damping: 17 }}
            onClick={() => setShowUploader(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-full font-medium shadow-lg shadow-purple-500/20 border border-purple-500/50 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            New Mix
          </motion.button>
        </div>
        
        {/* Фильтры по жанрам */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex gap-3 mb-8 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent"
        >
          <FilterButton 
            active={selectedMixGenre === 'all'} 
            onClick={() => setSelectedMixGenre('all')}
          >
            All
          </FilterButton>
          <FilterButton 
            active={selectedMixGenre === 'hip-hop'} 
            onClick={() => setSelectedMixGenre('hip-hop')}
          >
            Hip-Hop
          </FilterButton>
          <FilterButton 
            active={selectedMixGenre === 'electronic'} 
            onClick={() => setSelectedMixGenre('electronic')}
          >
            Electronic
          </FilterButton>
          <FilterButton 
            active={selectedMixGenre === 'pop'} 
            onClick={() => setSelectedMixGenre('pop')}
          >
            Pop
          </FilterButton>
          <FilterButton 
            active={selectedMixGenre === 'rock'} 
            onClick={() => setSelectedMixGenre('rock')}
          >
            Rock
          </FilterButton>
          <FilterButton 
            active={selectedMixGenre === 'jazz'} 
            onClick={() => setSelectedMixGenre('jazz')}
          >
            Jazz
          </FilterButton>
        </motion.div>
        
        {/* Сетка миксов */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {isLoadingMixes && allMixPosts.length === 0 ? (
            // Скелетоны для загрузки
            Array.from({ length: 6 }).map((_, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <MixCardSkeleton />
              </motion.div>
            ))
          ) : allMixPosts.length > 0 ? (
            // Отображение миксов
            allMixPosts.map((mix, index) => (
              <motion.div
                key={mix.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <MixCard mix={mix} />
              </motion.div>
            ))
          ) : (
            // Сообщение, если миксов нет
            <motion.div 
              className="col-span-full text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-gradient-to-br from-[#1A1C2E]/50 to-[#252742]/50 p-8 rounded-2xl border border-purple-500/10 shadow-lg max-w-lg mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-purple-500/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <p className="text-gray-300 text-lg mb-4">No mixes found. Be the first to create one!</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowUploader(true)}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-full font-medium shadow-lg shadow-purple-500/20 border border-purple-500/50 inline-flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Create Mix
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>
        
        {/* Индикатор загрузки дополнительных миксов */}
        {(isLoadingMixes && allMixPosts.length > 0) && (
          <div className="flex justify-center mt-10">
            <UniversalLoader 
              size="lg" 
              variant="pulse" 
              message="Loading more mixes..."
            />
          </div>
        )}
        
        {/* Невидимый элемент для отслеживания прокрутки */}
        {hasMore && <div ref={ref} className="h-10" />}
        
        {/* Модальное окно для создания микса */}
        {showUploader && (
          <MixUploader 
            onClose={() => setShowUploader(false)} 
            onSuccess={() => {
              setShowUploader(false);
              fetchAllMixes();
            }} 
          />
        )}
      </div>
    </Layout>
  );
}