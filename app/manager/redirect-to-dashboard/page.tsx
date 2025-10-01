"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectToDashboard() {
  const router = useRouter();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isManagerAuthenticated');
    if (isAuthenticated) {
      window.location.replace('/manager/dashboard');
    } else {
      window.location.replace('/manager/auth');
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#1A2338] flex items-center justify-center">
      <div className="w-12 h-12 border-t-2 border-[#20DDBB] border-solid rounded-full animate-spin"></div>
    </div>
  );
} 