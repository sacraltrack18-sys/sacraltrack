"use client";

import React, { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useUser } from '@/app/context/user';
import { 
  HomeIcon, 
  UserIcon, 
  MagnifyingGlassIcon,
  MusicalNoteIcon,
  SparklesIcon,
  ChatBubbleOvalLeftEllipsisIcon
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: ReactNode;
}

interface NavLinkProps {
  href: string;
  icon: ReactNode;
  label: string;
  isActive: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ href, icon, label, isActive }) => (
  <Link href={href} className="relative group">
    <div className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
      isActive 
        ? 'text-white' 
        : 'text-gray-400 hover:text-white'
    }`}>
      <div className="mb-1">{icon}</div>
      <span className="text-xs font-medium">{label}</span>
      
      {isActive && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </div>
  </Link>
);

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const { user } = useUser() || { user: null };
  
  return (
    <div className="flex flex-col min-h-screen bg-[#131524]">
      {/* Header with purple/indigo background */}
      <header className="bg-[#1A1C2E]/90 backdrop-blur-lg border-b border-purple-900/10 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image 
              src="/images/logo.svg" 
              alt="Logo" 
              width={40} 
              height={40} 
              className="mr-2"
            />
            <h1 className="text-xl font-bold text-white">SacralTrack</h1>
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link href="/search">
              <div className="p-2 rounded-full bg-[#252742] text-gray-400 hover:text-white transition-colors">
                <MagnifyingGlassIcon className="h-6 w-6" />
              </div>
            </Link>
            
            {user && (
              <Link href={`/profile/${user.id}`}>
                <div className="relative w-[50px] h-[50px] rounded-xl overflow-hidden border-[0.5px] border-purple-500/30">
                  <Image 
                    src={user.image || '/images/placeholders/user-placeholder.svg'} 
                    alt="Profile" 
                    fill
                    className="object-cover"
                  />
                </div>
              </Link>
            )}
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
};

export default Layout;