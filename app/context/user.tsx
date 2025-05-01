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

  const checkUser = async (): Promise<User | null> => {
    // Добавляем дебаунсинг с помощью ref переменной
    if (checkingRef.current) {
      return null;
    }
    
    checkingRef.current = true;
    setTimeout(() => { checkingRef.current = false }, 1000); // Защита от частых вызовов
    
    try {
      // Проверяем наличие существующей сессии без вызова getSession('current'),
      // который может вызвать ошибку 401 для гостей
      try {
        // Добавляем проверку флага googleAuthInProgress - если процесс аутентификации через Google еще идет,
        // не выбрасываем ошибку при ее возникновении
        const isGoogleAuthInProgress = typeof window !== 'undefined' && 
          window.sessionStorage && 
          window.sessionStorage.getItem('googleAuthInProgress') === 'true';
        
        // Используем account.get() напрямую, что выбросит ошибку если нет сессии
        const currentUser = await account.get();
        
        if (!currentUser) {
          setUser(null);
          dispatchAuthStateChange(null);
          return null;
        }

        // В production только важные логи
        if (process.env.NODE_ENV === 'development') {
          console.log('User account:', currentUser);
        }

        // В production только важные логи
        if (process.env.NODE_ENV === 'development') {
          console.log('Getting user profile...');
        }
        
        const profile = await useGetProfileByUserId(currentUser.$id);
        
        // В production только важные логи
        if (process.env.NODE_ENV === 'development') {
          console.log('User profile:', profile);
        }

        const userData = { 
          id: currentUser.$id, 
          name: currentUser.name,  
          bio: profile?.bio, 
          image: profile?.image 
        };
        
        // В production только важные логи
        if (process.env.NODE_ENV === 'development') {
          console.log('Setting user data:', userData);
        }
        
        // Store userId in localStorage for friend features
        if (typeof window !== 'undefined' && userData.id) {
          localStorage.setItem('userId', userData.id);
        }
        
        setUser(userData);
        
        // Dispatch auth state change event with new user data
        dispatchAuthStateChange(userData);
        
        // Force router refresh to update all components
        router.refresh();
        
        return userData;
        
      } catch (error: any) {
        // Проверяем, идет ли процесс аутентификации через Google
        const isGoogleAuthInProgress = typeof window !== 'undefined' && 
          window.sessionStorage && 
          window.sessionStorage.getItem('googleAuthInProgress') === 'true';
          
        // Enhanced error handling with specific error codes
        if (error?.code === 401 || (error?.message && error?.message.includes('missing scope'))) {
          // Показываем ошибку в консоли только если НЕ идет процесс авторизации через Google
          if (!isGoogleAuthInProgress) {
            console.log('User not authenticated:', error?.message);
          }
          setUser(null);
          dispatchAuthStateChange(null);
          return null;
        }
        
        // Handle specific Appwrite errors
        if (error?.code === 429) {
          console.warn('Rate limit exceeded for authentication requests. Please try again later.');
          // Don't clear user here, might be temporary issue
          return user; // Return current user state
        }
        
        if (error?.message && error?.message.includes('network')) {
          console.warn('Network error when authenticating. Check your connection and try again.');
          // For network errors, keep previous state if available
          return user;
        }
        
        // Handle specific Appwrite database connection errors
        if (error?.code === 503 || (error?.message && error?.message.includes('database'))) {
          console.error('Database service unavailable:', error?.message);
          // Return current user without clearing if we had one
          return user || null;
        }
        
        // Если идет процесс аутентификации через Google, не логируем другие ошибки
        // чтобы избежать лишних сообщений в консоли
        if (isGoogleAuthInProgress) {
          console.log('Authentication in progress, suppressing error logs');
          return null;
        }
        
        // Track authentication errors for debugging
        console.error('Authentication error details:', {
          code: error?.code || 'unknown',
          type: error?.type || 'unknown',
          message: error?.message || 'Unknown error',
          time: new Date().toISOString()
        });
        
        // Другие ошибки логируем
        console.error('Error checking user authentication:', error);
        setUser(null);
        dispatchAuthStateChange(null);
        return null;
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
        throw new Error('Too many registration attempts. Please try again later.');
      }
      
      if (error.code === 409) {
        throw new Error('Email already exists. Try logging in instead.');
      }
      
      // Re-throw the error with a clear message
      throw new Error(error.message || 'Registration failed. Please try again.');
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
      
      // Clear user ID from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('userId');
      }
      
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
