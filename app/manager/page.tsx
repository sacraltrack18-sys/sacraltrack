"use client";

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

export default function ManagerPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isManagerAuthenticated');
    if (!isAuthenticated) {
      document.location.href = '/manager/auth';
    } else {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A2338] flex items-center justify-center">
        <div className="w-12 h-12 border-t-2 border-[#20DDBB] border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A2338] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Manager Dashboard</h1>
          <button
            onClick={() => {
              localStorage.removeItem('isManagerAuthenticated');
              localStorage.removeItem('managerEmail');
              document.location.href = '/manager/auth';
            }}
            className="px-4 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            Logout
          </button>
        </div>
        <div className="bg-[#272B43] rounded-xl p-6 border border-[#3f2d63]">
          <h2 className="text-xl text-white mb-4">Welcome to Dashboard</h2>
          <p className="text-[#818BAC]">You are logged in as: {localStorage.getItem('managerEmail')}</p>
        </div>
      </div>
    </div>
  );
}

