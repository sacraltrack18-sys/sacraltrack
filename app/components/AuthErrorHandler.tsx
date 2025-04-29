"use client";

import { useEffect, useRef } from 'react';
import { useUser } from '../context/user';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface AuthErrorHandlerProps {
  children: React.ReactNode;
}

/**
 * Глобальная переменная для отслеживания отображаемых уведомлений об аутентификации
 * Предотвращает появление множественных уведомлений одновременно
 */
const activeAuthToasts = new Set<string>();

/**
 * Компонент для обработки ошибок авторизации
 * 
 * Этот компонент добавляет глобальный обработчик событий для API ошибок
 * и автоматически проверяет состояние авторизации когда возникают ошибки 401
 */
const AuthErrorHandler: React.FC<AuthErrorHandlerProps> = ({ children }) => {
  const { user, checkUser } = useUser() || {};
  const router = useRouter();
  const lastErrorTime = useRef<number>(0);
  const errorThrottleDelay = 5000; // 5 секунд между повторными сообщениями об ошибке
  const authCheckInProgressRef = useRef<boolean>(false);

  useEffect(() => {
    // При монтировании очищаем все toast уведомления и сбрасываем отслеживание
    toast.dismiss();
    activeAuthToasts.clear();

    // Обработчик для проверки состояния авторизации
    const checkAuthStatus = () => {
      // Предотвращаем множественные одновременные проверки
      if (authCheckInProgressRef.current) {
        console.log("Auth check already in progress, skipping");
        return;
      }
      
      authCheckInProgressRef.current = true;
      setTimeout(() => { authCheckInProgressRef.current = false }, 2000);
      
      console.log("Checking auth status from AuthErrorHandler");
      
      // Проверяем, идет ли процесс аутентификации через Google
      const isGoogleAuthInProgress = typeof window !== 'undefined' && 
        window.sessionStorage && 
        window.sessionStorage.getItem('googleAuthInProgress') === 'true';
      
      // Если идет процесс аутентификации через Google, не выполняем никаких действий
      if (isGoogleAuthInProgress) {
        console.log("Google auth in progress, skipping error handling");
        return;
      }
      
      if (checkUser) {
        checkUser().catch(console.error);
      }

      // Если пользователь не авторизован, перенаправляем на страницу логина
      // но только если прошло достаточно времени с момента последнего сообщения
      if (!user) {
        const now = Date.now();
        const timeSinceLastError = now - lastErrorTime.current;
        
        // Проверяем, находимся ли мы на странице, которая требует авторизации
        if (window.location.pathname !== '/auth/login' && 
            window.location.pathname !== '/auth/register' && 
            window.location.pathname !== '/' &&
            !window.location.pathname.startsWith('/auth/')) {
          
          // Проверяем, не отображается ли уже уведомление об ошибке аутентификации
          if (activeAuthToasts.has('auth-error-global')) {
            console.log("Auth error toast already displayed, skipping");
            return;
          }
          
          // Ограничиваем частоту сообщений об ошибках аутентификации
          if (timeSinceLastError > errorThrottleDelay) {
            lastErrorTime.current = now;
            
            // Удаляем все текущие уведомления для избежания перегрузки экрана
            toast.dismiss();
            
            // Добавляем в список активных уведомлений
            activeAuthToasts.add('auth-error-global');
            
            // Показываем уведомление
            const toastId = toast.error('Authentication required. Please log in.', {
              id: 'auth-error-global', // Используем уникальный ID для предотвращения дубликатов
              duration: 5000,
            });
            
            // Создаем таймер для автоматического удаления из списка активных
            setTimeout(() => {
              activeAuthToasts.delete('auth-error-global');
            }, 5500); // 5 секунд + запас 500мс
          }
          
          router.push('/auth/login');
        }
      }
    };

    // Обработчик для запросов fetch, который будет перехватывать ошибки 401
    const originalFetch = window.fetch;
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      try {
        const response = await originalFetch(input, init);
        
        // Проверяем, идет ли процесс аутентификации через Google
        const isGoogleAuthInProgress = typeof window !== 'undefined' && 
          window.sessionStorage && 
          window.sessionStorage.getItem('googleAuthInProgress') === 'true';
        
        // Если получили ошибку 401 и не идет процесс аутентификации через Google
        if (response.status === 401 && !isGoogleAuthInProgress) {
          console.log("Received 401 from API, triggering auth check");
          const event = new CustomEvent('check_auth_state', {});
          window.dispatchEvent(event);
        }
        
        return response;
      } catch (error) {
        console.error("Fetch error:", error);
        throw error;
      }
    };

    // Патчим toast.error для отслеживания уведомлений об аутентификации
    const originalErrorToast = toast.error;
    toast.error = (message, options) => {
      // Если сообщение связано с аутентификацией, проверяем не показывается ли уже такое
      if (typeof message === 'string' && 
          (message.includes('Authentication') || message.includes('auth'))) {
        
        const toastId = options?.id || 'auth-error-' + Date.now();
        
        // Если уже отображается уведомление с этим ID, не показываем новое
        if (activeAuthToasts.has(toastId)) {
          console.log(`Toast with ID ${toastId} already active, skipping`);
          return toastId as string;
        }
        
        // Добавляем ID в список активных
        activeAuthToasts.add(toastId);
        
        // Используем оригинальную функцию без дополнительных опций
        const id = originalErrorToast(message, options);
        
        // Создаем таймер для автоматического удаления из списка активных через 5 секунд
        setTimeout(() => {
          activeAuthToasts.delete(toastId);
        }, (options?.duration || 5000) + 500); // Добавляем запас 500мс
        
        return id;
      }
      
      // Для обычных сообщений используем оригинальную функцию
      return originalErrorToast(message, options);
    };

    // Слушаем событие проверки авторизации
    window.addEventListener('check_auth_state', checkAuthStatus);

    return () => {
      // Удаляем обработчики при размонтировании компонента
      window.removeEventListener('check_auth_state', checkAuthStatus);
      window.fetch = originalFetch;
      toast.error = originalErrorToast;
      
      // Очищаем все уведомления и сбрасываем отслеживание
      toast.dismiss();
      activeAuthToasts.clear();
    };
  }, [user, checkUser, router]);

  return <>{children}</>;
};

export default AuthErrorHandler; 