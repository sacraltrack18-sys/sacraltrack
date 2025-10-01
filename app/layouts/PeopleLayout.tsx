"use client";

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useUser } from "@/app/context/user";
import { useRouter, usePathname } from "next/navigation";
import TopNav from "@/app/layouts/includes/TopNav";

interface PeopleLayoutProps {
    children: ReactNode;
}

export default function PeopleLayout({ children }: PeopleLayoutProps) {
    const userContext = useUser();   
    const router = useRouter();
    const pathname = usePathname();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen bg-gradient-to-br from-[#1E1A36] to-[#2A2151]"
        >
            {/* Верхняя навигация с высоким z-index */}
            <TopNav params={{ id: userContext?.user?.id as string }} />
            
            {/* Упрощенный фоновый элемент */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-[#20DDBB] rounded-full filter blur-[100px] opacity-5"></div>
            </div>

            {/* Основной контент с учетом z-index */}
            <div className="flex mx-auto w-full px-[10px] md:px-0 relative z-[2] pt-[60px]">
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
        </motion.div>
    );
} 