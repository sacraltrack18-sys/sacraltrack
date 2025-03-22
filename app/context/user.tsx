"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { account, ID } from "@/libs/AppWriteClient"
import { User, UserContextTypes } from '../types';
import { useRouter } from 'next/navigation';
import useGetProfileByUserId from '../hooks/useGetProfileByUserId';
import useCreateProfile from '../hooks/useCreateProfile';
import { clearUserCache } from '../utils/cacheUtils';

const UserContext = createContext<UserContextTypes | null>(null);

const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null);

  const checkUser = async () => {
    try {
      console.log('Checking user session...');
      const currentSession = await account.getSession("current");
      console.log('Current session:', currentSession);
      
      if (!currentSession) {
        console.log('No current session found');
        return;
      }

      console.log('Getting user account...');
      const promise = await account.get() as any;
      console.log('User account:', promise);
      
      console.log('Getting user profile...');
      const profile = await useGetProfileByUserId(promise?.$id);
      console.log('User profile:', profile);

      const userData = { 
        id: promise?.$id, 
        name: promise?.name,  
        bio: profile?.bio, 
        image: profile?.image 
      };
      console.log('Setting user data:', userData);
      setUser(userData);
    } catch (error) {
      console.error('Error in checkUser:', error);
      setUser(null);
    }
  };

  useEffect(() => { checkUser() }, []);

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

      // Check for and delete any existing session
      try {
        const currentSession = await account.getSession('current');
        if (currentSession) {
          console.log('Found existing session, deleting it...');
          await account.deleteSession('current');
          console.log('Existing session deleted');
        }
      } catch (sessionError) {
        // If there's no session or error getting/deleting it, we can proceed
        console.log('No existing session found or error checking session');
      }
      
      console.log('Creating user account...');
      const promise = await account.create(ID.unique(), email, password, name);
      
      console.log('Creating email session...');
      await account.createEmailSession(email, password);

      console.log('Creating user profile...');
      await useCreateProfile(promise?.$id, name, String(process.env.NEXT_PUBLIC_PLACEHOLDER_DEAFULT_IMAGE_ID), '');
      
      console.log('Checking user status...');
      await checkUser();
      
      console.log('Registration completed successfully');
    } catch (error: any) {
      console.error('Registration error details:', error);
      
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
      }
      
      // Log the full error for debugging
      console.error('Detailed error information:', {
        code: error.code,
        message: error.message,
        type: error.type,
        response: error.response
      });
      
      // Generic error message as fallback
      throw new Error('Registration failed. Please try again later.');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      await account.createEmailSession(email, password);
      
      // Очистка кэша данных, связанных с предыдущим пользователем
      clearUserCache();
      
      checkUser();
    } catch (error) {
      console.error(error);
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
      setUser(null);
      
      // Очистка кэша данных, связанных с пользователем
      clearUserCache();
      
      router.refresh();
    } catch (error) {
      console.error(error);
    }
  };

  return (
      <UserContext.Provider value={{ user, register, login, logout, checkUser,       id: user?.id || null, // Add the 'id' property
      }}>
          {children}
      </UserContext.Provider>
  );
};

export default UserProvider;

export const useUser = () => useContext(UserContext)
