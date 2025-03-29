"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useUser } from "@/app/context/user";
import { useRouter } from "next/navigation";
import TopNav from "@/app/layouts/includes/TopNav";
import NotificationBell from "@/app/components/notifications/NotificationBell";

export default function PeopleLayout({ children }: { children: React.ReactNode }) {
    const userContext = useUser();   
    const router = useRouter();

    React.useEffect(() => {
        if (!userContext?.user) {
            router.push('/');
        }
        
        // Очистка при размонтировании
        return () => {
            // Здесь можно добавить любую необходимую очистку состояния
            console.log('PeopleLayout unmounted');
        };
    }, [userContext?.user, router]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0F111A] via-[#171923] to-[#0F111A]">
            <TopNav params={{ id: userContext?.user?.id as string }} />
            
            {/* Декоративное фоновое оформление без заголовка */}
            <div className="relative h-16 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 overflow-hidden">
                <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-10"></div>
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#171923] to-transparent"></div>
            </div>
            
            <div className="flex mx-auto w-full px-0">
                <div className="flex justify-center w-full px-0">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="w-full max-w-7xl mx-auto px-4 py-8"
                    >
                        {/* Floating notification indicator */}
                        <div className="fixed bottom-6 right-6 z-10">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                <NotificationBell />
                            </motion.div>
                        </div>
                        
                        {children}
                    </motion.div>
                </div>
            </div>
        </div>
    );
} 