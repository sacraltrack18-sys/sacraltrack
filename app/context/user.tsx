"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { account, ID } from "@/libs/AppWriteClient"
import { User, UserContextTypes } from '../types';
import { useRouter } from 'next/navigation';
import useGetProfileByUserId from '../hooks/useGetProfileByUserId';
import useCreateProfile from '../hooks/useCreateProfile';

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
      const promise = await account.create(ID.unique(), email, password, name)
      await account.createEmailSession(email, password);

      await useCreateProfile(promise?.$id, name, String(process.env.NEXT_PUBLIC_PLACEHOLDER_DEAFULT_IMAGE_ID), '')
      await checkUser() 

    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      await account.createEmailSession(email, password);
      checkUser();
    } catch (error) {
      console.error(error);
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
      setUser(null);
      router.refresh()
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
