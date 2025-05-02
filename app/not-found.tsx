'use client';

import Link from 'next/link'
import { motion } from 'framer-motion'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center relative overflow-hidden">
      {/* Background gradient bubbles */}
      <div className="gradient-bg">
        <div className="gradients-container">
          <div 
            className="dynamic-bubble pink"
            style={{
              top: '20%',
              left: '15%',
            }}
          />
          <div 
            className="dynamic-bubble purple"
            style={{
              bottom: '15%',
              right: '20%',
            }}
          />
        </div>
      </div>
      
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex justify-center mb-6"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 flex items-center justify-center relative">
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-blue-500"
            animate={{ 
              rotate: 360,
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{ 
              rotate: { duration: 10, repeat: Infinity, ease: "linear" },
              backgroundPosition: { duration: 5, repeat: Infinity, ease: "linear" },
            }}
            style={{ backgroundSize: "200% 200%" }}
          ></motion.div>
          <div className="bg-[#1E2136] rounded-full p-5 z-10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
      </motion.div>
      
      <motion.h2 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-3xl md:text-4xl font-bold mb-4 gradient-text"
      >
        Page Not Found
      </motion.h2>
      
      <motion.p 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mb-8 text-white/80 max-w-md"
      >
        The page you requested does not exist or may have been moved
      </motion.p>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <Link 
          href="/"
          className="px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold hover:from-purple-700 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1"
        >
          Return to Home
        </Link>
      </motion.div>
      
      <style jsx global>{`
        .gradient-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: -1;
        }
        
        .gradients-container {
          position: absolute;
          width: 100%;
          height: 100%;
        }
        
        .dynamic-bubble {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.3;
          animation: float 15s ease-in-out infinite;
        }
        
        .dynamic-bubble.pink {
          background-color: rgba(139, 92, 246, 0.4);
          animation-delay: 0s;
        }
        
        .dynamic-bubble.purple {
          background-color: rgba(59, 130, 246, 0.4);
          animation-delay: -5s;
        }
        
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(-50px, 50px);
          }
          50% {
            transform: translate(50px, -30px);
          }
          75% {
            transform: translate(30px, 40px);
          }
        }
        
        .gradient-text {
          background: linear-gradient(to right, #8B5CF6, #3B82F6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </div>
  )
} 