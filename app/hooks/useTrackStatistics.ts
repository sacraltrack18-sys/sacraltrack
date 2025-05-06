"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [retryCount, setRetryCount] = useState(0);
  
  // Счетчик обновлений статистики за одну загрузку компонента
  const updateCountRef = useRef(0);
  // Флаг первой загрузки
  const initialLoadRef = useRef(true);
  // Максимальное количество автоматических обновлений за одну загрузку
  const MAX_AUTO_UPDATES = 1;

  // Проверка и создание документа статистики при необходимости
  const ensureTrackStatisticsExist = useCallback(async () => {
    if (!trackId) return;
    
    try {
      // Пытаемся получить существующий документ статистики
      await database.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.statisticsCollectionId,
        trackId
      );
      
      console.log(`Statistics document exists for track ID: ${trackId}`);
      return true;
    } catch (error) {
      console.log(`Statistics document does not exist for track ID: ${trackId}, creating new one`);
      
      // Если документ не существует, создаем новый
      try {
        await database.createDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.statisticsCollectionId,
          trackId,
          {
            track_id: trackId,
            plays_count: "0",
            downloads_count: "0",
            likes: "0",
            shares: "0",
            unique_listeners: "0",
            last_played: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            device_types: {}
          }
        );
        
        console.log(`Created new statistics document for track ID: ${trackId}`);
        return true;
      } catch (createError) {
        console.error('Error creating statistics document:', createError);
        return false;
      }
    }
  }, [trackId]);

  // Функция для проверки, можно ли выполнить автоматическое обновление
  const canAutoUpdate = useCallback(() => {
    return updateCountRef.current < MAX_AUTO_UPDATES;
  }, []);

  // Функция для получения статистики
  const fetchStatistics = useCallback(async (isManualUpdate = false) => {
    if (!trackId) {
      setIsLoading(false);
      return;
    }

    // Проверяем, можно ли выполнить автоматическое обновление
    if (!isManualUpdate && !canAutoUpdate() && !initialLoadRef.current) {
      console.log(`Auto-update limit reached (${MAX_AUTO_UPDATES}). Skipping update.`);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Сначала убедимся, что документ статистики существует
      await ensureTrackStatisticsExist();
      
      console.log(`[useTrackStatistics] Fetching statistics for track ID: ${trackId}`);
      
      try {
        const response = await fetch(`/api/track-stats/${trackId}`);
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to fetch statistics (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.statistics) {
          console.log(`[useTrackStatistics] Successfully fetched statistics for track ID: ${trackId}`);
          setStatistics(data.statistics);
          setRetryCount(0); // Сбрасываем счетчик повторных попыток при успехе
          
          // Увеличиваем счетчик обновлений только для автоматических обновлений
          if (!isManualUpdate) {
            updateCountRef.current += 1;
            console.log(`Statistics update count: ${updateCountRef.current}/${MAX_AUTO_UPDATES}`);
          }
          
          // Сбрасываем флаг первой загрузки
          initialLoadRef.current = false;
        } else {
          console.warn('[useTrackStatistics] Statistics data not found:', data);
          // Если нет статистики, попробуем запросить ещё раз через небольшое время - но только если это не превысит лимит
          if (retryCount < 1 && (isManualUpdate || canAutoUpdate())) {
            setRetryCount(prev => prev + 1);
            setTimeout(() => fetchStatistics(isManualUpdate), 1000);
          }
        }
      } catch (fetchError) {
        console.error('[useTrackStatistics] Error fetching track statistics:', fetchError);
        setError(fetchError instanceof Error ? fetchError : new Error('Failed to fetch track statistics'));
        
        // Если произошла ошибка, попробуем запросить ещё раз через небольшое время - но только если это не превысит лимит
        if (retryCount < 1 && (isManualUpdate || canAutoUpdate())) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => fetchStatistics(isManualUpdate), 1000);
        }
      }
    } catch (error) {
      console.error('[useTrackStatistics] General error:', error);
      setError(error instanceof Error ? error : new Error('Failed to fetch track statistics'));
    } finally {
      setIsLoading(false);
    }
  }, [trackId, ensureTrackStatisticsExist, retryCount, canAutoUpdate]);
  
  // Функция для ручного обновления статистики (не учитывается в лимите)
  const manualFetchStatistics = useCallback(() => {
    return fetchStatistics(true);
  }, [fetchStatistics]);
  
  // Функция для обновления определенного поля статистики
  const updateStatistic = useCallback(async (field: string, value: number = 1, operation: 'increment' | 'set' = 'increment') => {
    if (!trackId) return;
    
    try {
      // Убедимся, что документ статистики существует
      await ensureTrackStatisticsExist();
      
      // Получаем текущую статистику, если она не была загружена
      if (!statistics) {
        await fetchStatistics(true); // Используем ручное обновление, чтобы не влиять на лимит
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
      
      // После обновления принудительно обновляем данные (как ручное обновление)
      setTimeout(() => fetchStatistics(true), 500);
      
    } catch (error) {
      console.error(`Error updating ${field} statistic:`, error);
      // Откатываем локальное состояние в случае ошибки
      fetchStatistics(true);
    }
  }, [trackId, statistics, fetchStatistics, ensureTrackStatisticsExist]);
  
  // Специализированные функции для различных типов статистики
  const incrementPlayCount = useCallback(() => updateStatistic('plays_count'), [updateStatistic]);
  const incrementLikesCount = useCallback(() => updateStatistic('likes'), [updateStatistic]);
  const incrementSharesCount = useCallback(() => updateStatistic('shares'), [updateStatistic]);
  const incrementDownloadsCount = useCallback(() => updateStatistic('downloads_count'), [updateStatistic]);
  const incrementPurchasesCount = useCallback(() => updateStatistic('purchases_count'), [updateStatistic]);

  // Загружаем статистику при монтировании и при изменении trackId
  useEffect(() => {
    // Сбрасываем счетчик обновлений при изменении trackId
    updateCountRef.current = 0;
    initialLoadRef.current = true;
    
    // Сначала убедимся, что документ статистики существует
    if (trackId) {
      // Первое обновление происходит при монтировании компонента
      ensureTrackStatisticsExist()
        .then(() => {
          return fetchStatistics(); // Это первое обновление
        })
        .catch(console.error);
    
      // Больше не настраиваем интервал для периодического обновления
      // Обновление теперь происходит только при загрузке страницы или при конкретных действиях пользователя
      
      return () => {
        // Нет интервала для очистки
      };
    }
  }, [trackId, fetchStatistics, ensureTrackStatisticsExist, canAutoUpdate]);

  return {
    statistics,
    isLoading,
    error,
    fetchStatistics: manualFetchStatistics, // Возвращаем функцию для ручного обновления
    updateStatistic,
    incrementPlayCount,
    incrementLikesCount,
    incrementSharesCount,
    incrementDownloadsCount,
    incrementPurchasesCount
  };
};

export default useTrackStatistics; 