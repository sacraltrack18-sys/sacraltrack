'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useUser } from '../context/user';
import { useGeneralStore } from '../stores/general';
import { useRouter } from 'next/navigation';
import useDeviceDetect from '../hooks/useDeviceDetect';
import { usePostStore } from '../stores/post';
import { useVibeStore } from '../stores/vibeStore';
import { useMixStore } from '../stores/mixStore';

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ href, label, icon, isActive, onClick }) => {
  return (
    <Link href={href} onClick={onClick}>
      <div
        className={`flex items-center gap-4 p-4 hover:bg-gray-100 rounded-xl transition-colors ${isActive ? 'bg-gray-100' : ''}`}
      >
        <div className={`${isActive ? 'text-primary' : 'text-gray-500'}`}>{icon}</div>
        <span className={`text-lg ${isActive ? 'font-semibold text-primary' : 'text-gray-700'}`}>{label}</span>
      </div>
    </Link>
  );
};

export default function SideNavigation() {
  const pathname = usePathname();
  const userContext = useUser();
  const user = userContext?.user;
  const logout = userContext?.logout;
  const { isMobile } = useDeviceDetect();
  const { setAllPosts } = usePostStore();
  const { resetVibeState } = useVibeStore();
  const { resetMixState } = useMixStore();
  const { setIsLoginOpen, setIsEditProfileOpen } = useGeneralStore();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      if (logout) {
        // Reset states before logout
        setAllPosts();
        resetVibeState();
        resetMixState();
        
        await logout();
        router.push('/');
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleHomeClick = () => {
    setAllPosts();
  };

  const handleVibeClick = () => {
    resetVibeState();
  };

  const handleMixClick = () => {
    resetMixState();
  };

  return (
    <div className="h-full flex flex-col justify-between py-4">
      <div className="space-y-2">
        <NavItem
          href="/"
          label="Home"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
              />
            </svg>
          }
          isActive={pathname === '/'}
          onClick={handleHomeClick}
        />

        <NavItem
          href="/vibe"
          label="Vibe"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
              />
            </svg>
          }
          isActive={pathname === '/vibe' || pathname.startsWith('/vibe/')}
          onClick={handleVibeClick}
        />

        <NavItem
          href="/mix"
          label="Mixes"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
              />
            </svg>
          }
          isActive={pathname === '/mix' || pathname.startsWith('/mix/')}
          onClick={handleMixClick}
        />

        <NavItem
          href="/search"
          label="Search"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          }
          isActive={pathname === '/search'}
        />

        {user && (
          <NavItem
            href={`/profile/${user.id}`}
            label="Profile"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            }
            isActive={pathname === `/profile/${user.id}`}
          />
        )}
      </div>

      <div>
        {user ? (
          <div
            onClick={handleSignOut}
            className="flex items-center gap-4 p-4 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            <div className="text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                />
              </svg>
            </div>
            <span className="text-lg text-gray-700">Logout</span>
          </div>
        ) : (
          <div
            onClick={() => setIsLoginOpen(true)}
            className="flex items-center gap-4 p-4 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            <div className="text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
            </div>
            <span className="text-lg text-gray-700">Login</span>
          </div>
        )}
      </div>
    </div>
  );
}