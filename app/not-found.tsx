'use client';

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

// Particle type definition
type Particle = {
  x: number;
  y: number;
  size: number;
  speed: number;
  color: string;
};

export default function NotFound() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  // Generate random particles for background
  useEffect(() => {
    const particlesArray: Particle[] = [];
    const colors = ['#8B5CF6', '#EC4899', '#3B82F6', '#EF4444', '#10B981'];
    
    for (let i = 0; i < 70; i++) {
      particlesArray.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 5 + 1,
        speed: Math.random() * 1.2 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    
    setParticles(particlesArray);
  }, []);
  
  // Animate particles
  useEffect(() => {
    if (!canvasRef.current || particles.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const animateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((particle, index) => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = 0.3;
        ctx.fill();
        
        // Add a subtle glow for larger particles
        if (particle.size > 3) {
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = particle.color;
          ctx.globalAlpha = 0.1;
          ctx.fill();
        }
        
        // Move particle
        particles[index].y -= particle.speed;
        
        // Add slight horizontal drift for more natural movement
        particles[index].x += Math.sin(Date.now() * 0.001 + index) * 0.3;
        
        // Reset particle if it goes off screen
        if (particles[index].y < -10) {
          particles[index].y = canvas.height + 10;
          particles[index].x = Math.random() * canvas.width;
        }
      });
      
      animationRef.current = requestAnimationFrame(animateParticles);
    };
    
    animateParticles();
    
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [particles]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center relative overflow-hidden">
      {/* Animated particles background */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-0 opacity-70"
      />
      
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
          <div 
            className="dynamic-bubble blue"
            style={{
              top: '60%',
              left: '60%',
            }}
          />
        </div>
      </div>
      
      <div className="relative z-10 glassmorphism px-8 py-10 rounded-3xl max-w-2xl w-full mx-auto shadow-cosmic">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            duration: 0.5,
            type: "spring",
            stiffness: 100
          }}
          className="flex justify-center mb-8"
        >
          <div className="w-28 h-28 rounded-full bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500 flex items-center justify-center relative">
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500"
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
            <div className="bg-[#1E2136] rounded-full p-6 z-10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </motion.div>
        
        <motion.h2 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-4xl md:text-5xl font-bold mb-4 gradient-text-404"
        >
          Page Not Found
        </motion.h2>
        
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mb-8 text-white/80 max-w-lg mx-auto space-y-4"
        >
          <p className="text-lg">
            It seems you've ventured into uncharted space. The page you're looking for has drifted to another galaxy or never existed.
          </p>
        </motion.div>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex gap-4 flex-wrap justify-center"
        >
          <motion.div
            whileHover={{ scale: 1.05, boxShadow: "0 10px 25px -5px rgba(139, 92, 246, 0.5)" }}
            whileTap={{ scale: 0.95 }}
            className="relative"
          >
            <Link 
              href="/"
              className="inline-flex items-center px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold transition-all duration-300 shadow-lg relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center">
                <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Return to Home
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"></span>
              <span className="absolute -inset-px rounded-full border border-white/20 z-0"></span>
            </Link>
          </motion.div>
        </motion.div>
        
        {/* Wave decoration at the bottom of the card */}
        <div className="absolute -bottom-5 left-0 w-full overflow-hidden h-12 z-0">
          <svg 
            className="absolute bottom-0 w-full h-full text-[#1E2136] transform-gpu opacity-30 blur-[3px]" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 1440 320"
          >
            <path 
              fill="currentColor" 
              fillOpacity="1" 
              d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,235,864,250.7C960,267,1056,245,1152,250.7C1248,256,1344,288,1392,304L1440,320L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            ></path>
          </svg>
        </div>
      </div>
      
      <div className="absolute bottom-4 left-0 w-full text-center text-white/40 text-sm">
        Error code: 404
      </div>
      
      <style jsx global>{`
        body {
          overflow: hidden;
          background-color: #13141F;
        }
        
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
          width: 600px;
          height: 600px;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.2;
          animation: float 25s ease-in-out infinite;
        }
        
        .dynamic-bubble.pink {
          background-color: rgba(139, 92, 246, 0.5);
          animation-delay: 0s;
        }
        
        .dynamic-bubble.purple {
          background-color: rgba(59, 130, 246, 0.5);
          animation-delay: -5s;
        }
        
        .dynamic-bubble.blue {
          background-color: rgba(111, 85, 255, 0.5);
          animation-delay: -10s;
        }
        
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(-50px, 50px) scale(1.1);
          }
          50% {
            transform: translate(50px, -30px) scale(0.9);
          }
          75% {
            transform: translate(30px, 40px) scale(1.05);
          }
        }
        
        .gradient-text-404 {
          background: linear-gradient(to right, #8B5CF6, #6366F1, #3B82F6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradientText 8s ease infinite;
          background-size: 200% 200%;
        }
        
        @keyframes gradientText {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .glassmorphism {
          background: rgba(30, 33, 54, 0.5);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }
        
        .shadow-cosmic {
          box-shadow: 0 20px 50px -15px rgba(0, 0, 0, 0.5),
                      0 0 30px 0px rgba(139, 92, 246, 0.1);
        }
      `}</style>
    </div>
  )
} 