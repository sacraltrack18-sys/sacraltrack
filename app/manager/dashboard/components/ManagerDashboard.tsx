"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BsCashStack, BsCheck2Circle, BsXCircle, BsClock, BsBell } from 'react-icons/bs';
import { toast } from 'react-hot-toast';
import { database, Query } from '@/libs/AppWriteClient';

export default function ManagerDashboard() {
  const router = useRouter();

  useEffect(() => {
    // Проверяем аутентификацию только при монтировании компонента
    const isAuthenticated = sessionStorage.getItem('isManagerAuthenticated');
    if (!isAuthenticated) {
      router.replace('/manager/auth');
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('isManagerAuthenticated');
    router.replace('/manager/auth');
  };

  // ... остальной код dashboard ...

  return (
    <div className="min-h-screen bg-[#1A2338] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Withdrawal Management</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            Logout
          </button>
        </div>
        {/* ... остальной JSX код ... */}
      </div>
    </div>
  );
} 