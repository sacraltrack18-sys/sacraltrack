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
        <div className="min-h-screen bg-gradient-to-b from-[#161824] via-[#1F2339] to-[#161824]">
            <TopNav params={{ id: userContext?.user?.id as string }} />
            
            {/* Фоновые элементы и узоры */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-purple-600 rounded-full filter blur-[150px] opacity-10 transform translate-x-1/4 -translate-y-1/4"></div>
                <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-600 rounded-full filter blur-[150px] opacity-10 transform -translate-x-1/4 translate-y-1/4"></div>
                <div className="absolute top-1/3 left-1/4 w-1/4 h-1/4 bg-indigo-600 rounded-full filter blur-[120px] opacity-10"></div>
            </div>
            
            <div className="flex mx-auto w-full px-0 relative">
                <div className="flex justify-center w-full px-0">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="w-full max-w-7xl mx-auto px-4 py-8"
                    >
                        {/* Removed Floating notification indicator */}
                        
                        {children}
                    </motion.div>
                </div>
            </div>
        </div>
    );
} 