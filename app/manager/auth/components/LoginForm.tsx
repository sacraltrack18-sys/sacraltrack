"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BsShieldLock } from 'react-icons/bs';
import { toast } from 'react-hot-toast';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen bg-[#1A2338] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#272B43] rounded-2xl p-8 border border-[#3f2d63] shadow-xl">
          <div className="flex items-center justify-center mb-8">
            <div className="p-3 bg-[#20DDBB]/10 rounded-xl">
              <BsShieldLock size={32} className="text-[#20DDBB]" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white text-center mb-6">
            Manager Access
          </h2>

          <form 
            method="POST" 
            action="/manager/dashboard"
            onSubmit={(e) => {
              e.preventDefault();
              if (email === 'manager@yoursite.com') {
                localStorage.setItem('isManagerAuthenticated', 'true');
                localStorage.setItem('managerEmail', email);
                toast.success('Welcome, Manager!');
                // Используем прямое перенаправление через форму
                e.currentTarget.submit();
              } else {
                toast.error('Access denied. Invalid manager email.');
              }
            }}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-medium text-[#818BAC] mb-2">
                Manager Email
              </label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1A2338] text-white px-4 py-3 rounded-xl border border-[#3f2d63]
                         focus:outline-none focus:border-[#20DDBB] transition-colors"
                placeholder="Enter manager email"
                required
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className={`w-full bg-gradient-to-r from-[#20DDBB] to-[#1E88E5] text-white font-bold py-4 rounded-xl
                        transition-all duration-300 flex items-center justify-center gap-3
                        ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg'}`}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Login as Manager</span>
              )}
            </motion.button>
          </form>

          <p className="mt-4 text-center text-sm text-[#818BAC]">
            Use email: manager@yoursite.com
          </p>
        </div>
      </motion.div>
    </div>
  );
} 