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
    }, [userContext?.user, router]);

    return (
        <>
            <TopNav params={{ id: userContext?.user?.id as string }} />
            <div className="flex mx-auto w-full px-0">
                <div className="flex justify-center w-full px-0">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="w-full max-w-7xl mx-auto px-4 py-8"
                    >
                        {children}
                    </motion.div>
                </div>
            </div>
        </>
    );
} 