"use client";

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUser } from "@/app/context/user";
import { useRouter, usePathname } from "next/navigation";
import TopNav from "@/app/layouts/includes/TopNav";

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
        </div>
    );
} 