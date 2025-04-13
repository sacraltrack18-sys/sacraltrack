"use client";

import { useState, useEffect, useCallback } from 'react';
import { database } from '@/libs/AppWriteClient';
import { APPWRITE_CONFIG } from '@/libs/AppWriteClient';

// Определяем интерфейс для статистики трека
interface TrackStatisticsData {
  plays_count?: string;
  downloads_count?: string;
  purchases_count?: string;
  likes?: string;
  shares?: string;
  last_played?: string | null;
  created_at?: string;
  updated_at?: string;
  track_id?: string;
  unique_listeners?: string;
  [key: string]: any; // Для поддержки динамических полей
}

// Хук для получения и управления статистикой трека
const useTrackStatistics = (trackId?: string) => {
  const [statistics, setStatistics] = useState<TrackStatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);

  // Функция для получения статистики
  const fetchStatistics = useCallback(async () => {
    if (!trackId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/track-stats/${trackId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }
      
      const data = await response.json();
      
      if (data.success && data.statistics) {
        setStatistics(data.statistics);
      } else {
        console.warn('Statistics data not found:', data);
      }
    } catch (error) {
      console.error('Error fetching track statistics:', error);
      setError(error instanceof Error ? error : new Error('Failed to fetch track statistics'));
    } finally {
      setIsLoading(false);
    }
  }, [trackId]);
  
  // Функция для обновления определенного поля статистики
  const updateStatistic = useCallback(async (field: string, value: number = 1, operation: 'increment' | 'set' = 'increment') => {
    if (!trackId) return;
    
    try {
      // Получаем текущую статистику, если она не была загружена
      if (!statistics) {
        await fetchStatistics();
      }
      
      // Обновляем статистику в локальном состоянии для мгновенной реакции UI
      if (operation === 'increment') {
        setStatistics(prev => {
          if (!prev) return { [field]: value.toString() } as TrackStatisticsData;
          // Преобразуем текущее значение в число, добавляем новое значение и возвращаем как строку
          const currentValue = prev[field] ? parseInt(prev[field] as string, 10) : 0;
          return { ...prev, [field]: (currentValue + value).toString() };
        });
      } else {
        setStatistics(prev => {
          if (!prev) return { [field]: value.toString() } as TrackStatisticsData;
          return { ...prev, [field]: value.toString() };
        });
      }
      
      // Обновляем статистику на сервере
      await fetch(`/api/update-track-stats/${trackId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          field, 
          value, 
          operation 
        }),
      });
      
    } catch (error) {
      console.error(`Error updating ${field} statistic:`, error);
      // Откатываем локальное состояние в случае ошибки
      fetchStatistics();
    }
  }, [trackId, statistics, fetchStatistics]);
  
  // Специализированные функции для различных типов статистики
  const incrementPlayCount = useCallback(() => updateStatistic('plays_count'), [updateStatistic]);
  const incrementLikesCount = useCallback(() => updateStatistic('likes'), [updateStatistic]);
  const incrementSharesCount = useCallback(() => updateStatistic('shares'), [updateStatistic]);
  const incrementDownloadsCount = useCallback(() => updateStatistic('downloads_count'), [updateStatistic]);
  const incrementPurchasesCount = useCallback(() => updateStatistic('purchases_count'), [updateStatistic]);

  // Загружаем статистику при монтировании и при изменении trackId
  useEffect(() => {
    fetchStatistics();
    
    // Настраиваем интервал обновления каждые 30 секунд для получения актуальных данных
    const intervalId = setInterval(() => {
      fetchStatistics();
    }, 30000); // 30 секунд
    
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchStatistics]);

  return {
    statistics,
    isLoading,
    error,
    fetchStatistics,
    updateStatistic,
    incrementPlayCount,
    incrementLikesCount,
    incrementSharesCount,
    incrementDownloadsCount,
    incrementPurchasesCount
  };
};

export default useTrackStatistics; 