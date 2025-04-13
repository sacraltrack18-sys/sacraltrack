"use client";

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUser } from "@/app/context/user";
import { useRouter, usePathname } from "next/navigation";
import TopNav from "@/app/layouts/includes/TopNav";
import Link from 'next/link';
import { UserIcon, HomeIcon, MusicalNoteIcon, SparklesIcon, ChatBubbleOvalLeftEllipsisIcon } from '@heroicons/react/24/outline';

export default function PeopleLayout({ children }: { children: React.ReactNode }) {
    const userContext = useUser();   
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!userContext?.user) {
            router.push('/');
        }
        
        // Очистка при размонтировании
        return () => {
            console.log('PeopleLayout unmounted');
        };
    }, [userContext?.user, router]);

    // Компонент навигационной ссылки для мобильного меню
    const NavLink = ({ href, icon, label, isActive }: { href: string, icon: React.ReactNode, label: string, isActive: boolean }) => (
        <Link href={href} className="relative group">
            <div className={`flex flex-col items-center py-2 px-2 rounded-lg transition-colors ${
                isActive 
                ? 'text-[#20DDBB]' 
                : 'text-gray-400 hover:text-white'
            }`}>
                <div className="mb-1">{icon}</div>
                <span className="text-xs font-medium">{label}</span>
                
                {isActive && (
                <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-10 h-1 bg-gradient-to-r from-[#20DDBB] to-[#5D59FF] rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
                )}
            </div>
        </Link>
    );

    return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#1F2339,#161824)] relative">
            {/* Верхняя навигация с высоким z-index */}
            <TopNav params={{ id: userContext?.user?.id as string }} />
            
            {/* Фоновые элементы и узоры с улучшенным стилем - явно указываем z-index и pointer-events: none */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-2/5 h-2/5 bg-[#20DDBB] rounded-full filter blur-[150px] opacity-5 transform translate-x-1/4 -translate-y-1/4"></div>
                <div className="absolute bottom-0 left-0 w-2/5 h-2/5 bg-[#5D59FF] rounded-full filter blur-[150px] opacity-5 transform -translate-x-1/4 translate-y-1/4"></div>
                <div className="absolute top-1/3 left-1/4 w-1/4 h-1/4 bg-purple-600 rounded-full filter blur-[120px] opacity-5"></div>
                
                {/* Декоративные линии */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-[15%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#20DDBB]/30 to-transparent"></div>
                    <div className="absolute top-[85%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#5D59FF]/30 to-transparent"></div>
                </div>
            </div>

            {/* Основной контент с учетом z-index */}
            <div className="flex mx-auto w-full px-0 relative z-[2] pt-[60px]">
                <div className="flex justify-center w-full px-0 relative">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="w-full"
                    >
                        {children}
                    </motion.div>
                </div>
            </div>
            
            {/* Мобильное меню навигации */}
            <motion.nav 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ 
                    type: "spring", 
                    stiffness: 260, 
                    damping: 20,
                    duration: 0.5 
                }}
                className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1A1C2E]/90 backdrop-blur-md border-t border-white/10 z-[900] shadow-lg"
            >
                <div className="container mx-auto px-2 py-1">
                    <div className="flex justify-around">
                        <NavLink 
                            href="/" 
                            icon={<HomeIcon className="h-6 w-6" />} 
                            label="Home"
                            isActive={pathname === '/'}
                        />
                        <NavLink 
                            href="/discover" 
                            icon={<MusicalNoteIcon className="h-6 w-6" />} 
                            label="Discover"
                            isActive={pathname === '/discover'}
                        />
                        <NavLink 
                            href="/vibe" 
                            icon={<SparklesIcon className="h-6 w-6" />} 
                            label="Vibe"
                            isActive={pathname === '/vibe'}
                        />
                        <NavLink 
                            href="/chat" 
                            icon={<ChatBubbleOvalLeftEllipsisIcon className="h-6 w-6" />} 
                            label="Chat"
                            isActive={pathname === '/chat'}
                        />
                        <NavLink 
                            href="/people" 
                            icon={<UserIcon className="h-6 w-6" />} 
                            label="People"
                            isActive={pathname === '/people'}
                        />
                    </div>
                </div>
            </motion.nav>
        </div>
    );
} 