"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { account, ID } from "@/libs/AppWriteClient"
import { User, UserContextTypes } from '../types';
import { useRouter } from 'next/navigation';
import useGetProfileByUserId from '../hooks/useGetProfileByUserId';
import useCreateProfile from '../hooks/useCreateProfile';
import { clearUserCache } from '../utils/cacheUtils';

// Custom event for authentication state changes
export const AUTH_STATE_CHANGE_EVENT = 'auth_state_change';

// Function to dispatch authentication state change event
export const dispatchAuthStateChange = (userData: User | null) => {
  // Обновляем временную метку кэша для сброса URL изображений
  if (typeof window !== 'undefined') {
    const timestamp = Date.now();
    window.localStorage.setItem('cache_timestamp', timestamp.toString());
  }
  
  // Создаем и отправляем пользовательское событие
  const event = new CustomEvent(AUTH_STATE_CHANGE_EVENT, { 
    detail: { user: userData }
  });
  window.dispatchEvent(event);
  console.log('Auth state change event dispatched:', userData ? 'User logged in' : 'User logged out');
};

const UserContext = createContext<UserContextTypes | null>(null);

const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null);
  const checkingRef = React.useRef<boolean>(false);

  const checkUser = async () => {
    // Добавляем дебаунсинг с помощью ref переменной
    if (checkingRef.current) {
      return null;
    }
    
    checkingRef.current = true;
    setTimeout(() => { checkingRef.current = false }, 1000); // Защита от частых вызовов
    
    try {
      // Заменяем прямое использование cookies() на проверку через account API
      try {
        // Проверяем наличие существующей сессии
        const currentSession = await account.getSession('current');
        
        // Если нет активной сессии
        if (!currentSession) {
          setUser(null);
          dispatchAuthStateChange(null);
          return null;
        }
      } catch (sessionError: any) {
        // Если возникла ошибка при проверке сессии, скорее всего пользователь не авторизован
        console.error('Error checking session:', sessionError?.message);
          setUser(null);
          dispatchAuthStateChange(null);
        return null;
      }

      try {
        const promise = await account.get() as any;
        // В production только важные логи
        if (process.env.NODE_ENV === 'development') {
        console.log('User account:', promise);
        }

        // В production только важные логи
        if (process.env.NODE_ENV === 'development') {
          console.log('Getting user profile...');
        }
        
        const profile = await useGetProfileByUserId(promise?.$id);
        
        // В production только важные логи
        if (process.env.NODE_ENV === 'development') {
          console.log('User profile:', profile);
        }

        const userData = { 
          id: promise?.$id, 
          name: promise?.name,  
          bio: profile?.bio, 
          image: profile?.image 
        };
        
        // В production только важные логи
        if (process.env.NODE_ENV === 'development') {
          console.log('Setting user data:', userData);
        }
        
        setUser(userData);
        
        // Dispatch auth state change event with new user data
        dispatchAuthStateChange(userData);
        
        // Force router refresh to update all components
        router.refresh();
        
        return userData;
      } catch (accountError: any) {
        console.error('Error getting user account:', accountError?.message);
        
        // Если ошибка связана с отсутствием прав доступа
        if (accountError?.message?.includes('missing scope')) {
          console.log('Failed to get account due to missing scope');
          setUser(null);
          dispatchAuthStateChange(null);
          return null;
        }
        
        throw accountError;
      }
    } catch (error) {
      console.error('Error in checkUser:', error);
      setUser(null);
      dispatchAuthStateChange(null);
      return null;
    }
  };

  useEffect(() => { 
    // Check user on component mount
    checkUser();
    
    // Set up an interval to periodically check user session
    // Увеличиваем интервал проверки с 1 минуты до 5 минут
    const authCheckInterval = setInterval(() => {
      checkUser();
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => clearInterval(authCheckInterval);
  }, []);

  const register = async (name: string, email: string, password: string) => {
    try {
      console.log('Starting registration process...');
      
      // Validate inputs
      if (!name || !email || !password) {
        throw new Error('All fields are required');
      }
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }
      
      // Password validation
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Проверяем соединение с Appwrite API и валидность переменных окружения
      console.log('[DEBUG] Checking Appwrite connection and environment variables');
      console.log('[DEBUG] NEXT_PUBLIC_APPWRITE_URL:', process.env.NEXT_PUBLIC_APPWRITE_URL);
      console.log('[DEBUG] NEXT_PUBLIC_ENDPOINT:', process.env.NEXT_PUBLIC_ENDPOINT);
      console.log('[DEBUG] NEXT_PUBLIC_DATABASE_ID:', process.env.NEXT_PUBLIC_DATABASE_ID);
      console.log('[DEBUG] NEXT_PUBLIC_COLLECTION_ID_PROFILE:', process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE);

      // Не проверяем существующую сессию здесь, так как это вызывает ошибку guests missing scope
      
      console.log('Creating user account...');
      const userId = ID.unique();
      const promise = await account.create(userId, email, password, name);
      console.log('[DEBUG] Account created successfully:', promise?.$id);
      
      console.log('Creating email session...');
      const session = await account.createEmailSession(email, password);
      console.log('[DEBUG] Email session created successfully:', session.$id);

      console.log('Creating user profile...');
      try {
        // Используем SVG изображение вместо ID в хранилище
        const profileImagePath = '/images/placeholders/user-placeholder.svg';
        
        // Проверяем переменные окружения перед созданием профиля
        if (!process.env.NEXT_PUBLIC_DATABASE_ID || !process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE) {
          console.error('[DEBUG] Missing environment variables:',
            !process.env.NEXT_PUBLIC_DATABASE_ID ? 'NEXT_PUBLIC_DATABASE_ID' : '',
            !process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE ? 'NEXT_PUBLIC_COLLECTION_ID_PROFILE' : ''
          );
          throw new Error('Missing required environment variables for profile creation');
        }
        
        // Проверяем валидность userId
        if (!userId || typeof userId !== 'string') {
          console.error('[DEBUG] Invalid userId:', userId);
          throw new Error('Invalid user ID for profile creation');
        }
        
        // Выводим дополнительную информацию
        console.log('[DEBUG] Creating profile with image path:', profileImagePath);
        console.log('[DEBUG] Database ID:', process.env.NEXT_PUBLIC_DATABASE_ID);
        console.log('[DEBUG] Collection ID:', process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE);
        
        const profileResult = await useCreateProfile(userId, name, profileImagePath, '');
        console.log('[DEBUG] Profile created successfully:', profileResult);
        console.log('[DEBUG] Profile created successfully for user:', userId);
      } catch (profileError: any) {
        console.error('[DEBUG] Error creating profile:', profileError);
        console.error('[DEBUG] Error details:', {
          code: profileError.code,
          message: profileError.message,
          type: profileError.type,
          response: profileError.response
        });
        
        // Если профиль не удалось создать, удаляем аккаунт чтобы не оставлять "осиротевший" аккаунт
        try {
          await account.deleteSession('current');
          console.log('[DEBUG] Session deleted after profile creation failed');
        } catch (deleteError) {
          console.error('[DEBUG] Error deleting session after profile creation failed:', deleteError);
        }
        
        throw new Error('Failed to create user profile. Please try again later.');
      }
      
      console.log('Checking user status...');
      const userData = await checkUser();
      console.log('[DEBUG] User data after checkUser:', userData);
      
      // Force router refresh
      router.refresh();
      
      console.log('Registration completed successfully');
      return userData;
    } catch (error: any) {
      console.error('Registration error details:', error);
      
      // Более подробное логирование
      if (error.response) {
        console.error('[DEBUG] Full error response:', error.response);
      }
      
      console.error('[DEBUG] Error details:', {
        code: error.code,
        message: error.message,
        type: error.type
      });
      
      // Handle specific AppWrite error codes
      if (error.code === 429 || (error.message && error.message.toLowerCase().includes('rate limit'))) {
        throw new Error('Too many attempts. Please wait a few minutes before trying again.');
      } else if (error.code === 409) {
        throw new Error('This email is already registered. Please try logging in or use a different email.');
      } else if (error.code === 400) {
        if (error.message.includes('password')) {
          throw new Error('Password must be at least 8 characters long and contain at least one number.');
        } else if (error.message.includes('email')) {
          throw new Error('Please enter a valid email address.');
        } else if (error.message.includes('name')) {
          throw new Error('Please enter a valid name.');
        }
      } else if (error.code === 401 && error.type === 'user_session_already_exists') {
        throw new Error('Please log out before creating a new account.');
      } else if (error.code === 503) {
        throw new Error('Service temporarily unavailable. Please try again later.');
      } else if (error.code === 'undefined_endpoint') {
        throw new Error('API endpoint is not configured correctly. Please contact support.');
      }
      
      // Log the full error for debugging
      console.error('Detailed error information:', {
        code: error.code,
        message: error.message,
        type: error.type,
        response: error.response
      });
      
      // Generic error message as fallback
      throw new Error('Registration failed. Please try again later. ' + error.message);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Clear previous user cache before login
      clearUserCache();
      
      await account.createEmailSession(email, password);
      
      // Check user and update UI
      const userData = await checkUser();
      
      // Force router refresh
      router.refresh();
      
      return userData;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
      setUser(null);
      
      // Dispatch auth state change with null user
      dispatchAuthStateChange(null);
      
      // Clear user data cache
      clearUserCache();
      
      // Force router refresh
      router.refresh();
    } catch (error) {
      console.error(error);
    }
  };

  return (
      <UserContext.Provider value={{ 
          user, 
          register, 
          login, 
          logout, 
          checkUser 
      } as unknown as UserContextTypes}>
          {children}
      </UserContext.Provider>
  );
};

export default UserProvider;

export const useUser = () => useContext(UserContext)
