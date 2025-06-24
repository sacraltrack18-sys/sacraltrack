'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMixStore } from '../../stores/mixStore';
import { useUser } from '../../context/user';
import MixDetailPage from '../../components/mix/MixDetailPage';
import Layout from '../../components/Layout';

export default function MixDetail() {
  const { id } = useParams();
  const mixId = Array.isArray(id) ? id[0] : id;
  const { mixPostById, fetchMixById, isLoadingMixes, error, fetchUserLikedMixes } = useMixStore();
  const userContext = useUser();
  const user = userContext?.user;
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [forceRefresh, setForceRefresh] = useState(false);
  
  // Проверяем, был ли предыдущий сбой загрузки
  useEffect(() => {
    const failedLoad = localStorage.getItem(`mix-load-failed-${mixId}`);
    if (failedLoad) {
      setForceRefresh(true);
      localStorage.removeItem(`mix-load-failed-${mixId}`);
    }
  }, [mixId]);
  
  // Загружаем микс по ID
  useEffect(() => {
    if (mixId) {
      fetchMixById(mixId);
    }
  }, [mixId, fetchMixById, forceRefresh]);
  
  // Загружаем лайкнутые миксы пользователя
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
          } else {
            // Сохраняем информацию о сбое загрузки
            localStorage.setItem(`mix-load-failed-${mixId}`, 'true');
          }
        }
      };
      
      fetchLikedMixes();
    }
  }, [user?.id, fetchUserLikedMixes, retryCount, mixId]);
  
  // Отображаем скелетон во время загрузки
  if (isLoadingMixes) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded-lg mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded mb-4"></div>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Отображаем сообщение об ошибке
  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Отображаем сообщение, если микс не найден
  if (!mixPostById) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold mb-2">Mix Not Found</h2>
            <p className="text-gray-600">The mix you are looking for does not exist or has been removed.</p>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Отображаем страницу с деталями микса
  return (
    <Layout>
      <MixDetailPage mix={mixPostById} />
    </Layout>
  );
}