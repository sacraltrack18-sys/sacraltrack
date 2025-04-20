"use client";

import { useEffect } from 'react';
import { useUser } from '../context/user';
import { useRouter } from 'next/navigation';

interface AuthErrorHandlerProps {
  children: React.ReactNode;
}

/**
 * Компонент для обработки ошибок авторизации
 * 
 * Этот компонент добавляет глобальный обработчик событий для API ошибок
 * и автоматически проверяет состояние авторизации когда возникают ошибки 401
 */
const AuthErrorHandler: React.FC<AuthErrorHandlerProps> = ({ children }) => {
  const { user, checkUser } = useUser() || {};
  const router = useRouter();

  useEffect(() => {
    // Обработчик для проверки состояния авторизации
    const checkAuthStatus = () => {
      console.log("Checking auth status from AuthErrorHandler");
      if (checkUser) {
        checkUser().catch(console.error);
      }

      // Если пользователь не авторизован, перенаправляем на страницу логина
      if (!user) {
        // Проверяем, находимся ли мы на странице, которая требует авторизации
        if (window.location.pathname !== '/auth/login' && 
            window.location.pathname !== '/auth/register' && 
            window.location.pathname !== '/' &&
            !window.location.pathname.startsWith('/auth/')) {
          router.push('/auth/login');
        }
      }
    };

    // Обработчик для запросов fetch, который будет перехватывать ошибки 401
    const originalFetch = window.fetch;
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      try {
        const response = await originalFetch(input, init);
        
        // Если получили ошибку 401, отправляем событие для проверки авторизации
        if (response.status === 401) {
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

    // Слушаем событие проверки авторизации
    window.addEventListener('check_auth_state', checkAuthStatus);

    return () => {
      // Удаляем обработчики при размонтировании компонента
      window.removeEventListener('check_auth_state', checkAuthStatus);
      window.fetch = originalFetch;
    };
  }, [user, checkUser, router]);

  return <>{children}</>;
};

export default AuthErrorHandler; 