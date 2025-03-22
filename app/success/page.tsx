'use client'
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@/app/context/user"
import { Suspense } from 'react'
import useCreatePurchase from "@/app/hooks/useCreatePurchase";
import { motion, AnimatePresence } from "framer-motion";

// Компонент музыкального лоадера
const MusicLoader = () => {
  return (
    <motion.div 
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="relative">
        <motion.div className="flex items-center justify-center space-x-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-4 h-16 bg-gradient-to-t from-purple-600 to-pink-500 rounded-full"
              animate={{
                height: [16, 40, 16],
                backgroundColor: ["#9333ea", "#ec4899", "#9333ea"]
              }}
              transition={{
                repeat: Infinity,
                duration: 1,
                delay: i * 0.1,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.div>
        <motion.div
          className="absolute -bottom-8 w-full text-center text-white text-sm font-medium"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Loading...
        </motion.div>
      </div>
    </motion.div>
  );
};

export default function SuccessPage() {
  // Страница только для успеха покупки трека
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen">
      <div className="bg-[#1E2136] rounded-2xl p-2 w-full max-w-md shadow-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-gray-700 rounded-xl"></div>
          <div className="h-8 bg-gray-700 rounded-xl w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded-xl w-1/2"></div>
        </div>
      </div>
    </div>}>
      <SuccessPageContent />
    </Suspense>
  )
}

function SuccessPageContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const router = useRouter()
  const userContext = useUser()

  const { createPurchase, isLoading: createPurchaseLoading, error: createPurchaseError } = useCreatePurchase()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isProcessed, setIsProcessed] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [activeButton, setActiveButton] = useState<'profile' | 'explore' | null>(null)

  // Проверяем, что мы на клиенте
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    // Если мы не на клиенте, не выполняем код
    if (!isClient) return;
    
    // If payment is already processed or no session ID, don't continue
    if (isProcessed || !sessionId) return;

    // If user context is still loading, wait
    if (userContext === undefined) return;

    // Сохраняем ID пользователя, даже если контекст пустой
    if (userContext?.user?.id) {
      setUserId(userContext.user.id);
    } else {
      // Пытаемся получить ID из localStorage только на клиенте
      try {
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
          setUserId(storedUserId);
        }
      } catch (e) {
        console.error("Error accessing localStorage:", e);
      }
    }

    const handlePaymentSuccess = async () => {
      try {
        console.log("Starting handlePaymentSuccess...")

        if (!sessionId) {
          setError("Session ID is missing")
          setIsLoading(false)
          console.log("Session ID is missing")
          return
        }

        // Проверяем ID пользователя из контекста или из localStorage
        let currentUserId = userContext?.user?.id;
        
        // Если ID все еще отсутствует, пытаемся получить его из URL
        if (!currentUserId) {
          const urlUserId = searchParams.get("user_id");
          if (urlUserId) {
            currentUserId = urlUserId;
          }
        }
        
        if (!currentUserId) {
          setError("User information is missing")
          setIsLoading(false)
          return
        }
        
        setUserId(currentUserId);

        console.log("Session ID:", sessionId)
        console.log("User ID:", currentUserId)
        console.log("User context:", userContext);
        console.log("Session ID from URL:", sessionId);

        // Get session information from Stripe
        const response = await fetch(`/api/verify_payment?session_id=${sessionId}`)
        const data = await response.json()

        console.log("API response data:", data);

        if (!response.ok) {
          throw new Error(data.error || 'Payment verification failed')
        }

        // Если в ответе API есть user_id, используем его
        if (data.session?.metadata?.userId) {
          currentUserId = data.session.metadata.userId;
          setUserId(data.session.metadata.userId);
        }

        const { trackId, authorId } = data.session.metadata
        const amount = (data.session.amount_total / 100).toString() // Convert cents to dollars and to string

        if (!trackId || !authorId) {
          setError("Track information is missing")
          setIsLoading(false)
          return
        }

        try {
          // Create purchase record
          const purchaseResult = await createPurchase({
            user_id: currentUserId as string,
            track_id: trackId,
            author_id: authorId,
            amount: amount,
            session_id: sessionId
          })
          
          console.log("Purchase record created successfully.")
          setIsProcessed(true)
        } catch (purchaseError: any) {
          // If the error is due to duplicate purchase, we can consider it a success
          if (purchaseError.message?.includes('Purchase already exists')) {
            console.log("Purchase was already processed successfully.")
            setIsProcessed(true)
            return
          }
          throw purchaseError
        }

      } catch (err: any) {
        console.error("Error processing payment success:", err)
        console.error("Error details:", err);
        // Only set error if it's not a duplicate purchase case
        if (!err.message?.includes('Purchase already exists')) {
          setError("An error occurred while processing the payment.")
        } else {
          // Если ошибка связана с дубликатом покупки, считаем это успехом
          setIsProcessed(true)
        }
      } finally {
        setIsLoading(false)
      }
    }

    handlePaymentSuccess()
  }, [sessionId, userContext, createPurchase, isProcessed, isClient, searchParams])

  const handleNavigateHome = () => {
    setIsNavigating(true)
    setActiveButton('profile')
    setTimeout(() => {
      if (userId) {
        console.log("Navigating to user profile:", `/profile/${userId}`)
        router.push(`/profile/${userId}`)
      } else {
        console.error('userId is undefined or null')
        router.push('/')
      }
    }, 1500)
  }

  const handleNavigateExplore = () => {
    setIsNavigating(true)
    setActiveButton('explore')
    setTimeout(() => {
      router.push('/')
    }, 1500)
  }

  // Показываем успешную страницу даже если нет userId, но есть sessionId и isProcessed
  if (isProcessed && sessionId) {
    return (
      <div className="flex justify-center items-center h-screen p-[20px] bg-gradient-to-b from-[#1a1a2e] to-[#16213e]">
        <AnimatePresence>
          {isNavigating && <MusicLoader />}
        </AnimatePresence>
        
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10"
              style={{
                width: Math.random() * 100 + 50,
                height: Math.random() * 100 + 50,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                x: [0, Math.random() * 50 - 25],
                y: [0, Math.random() * 50 - 25],
                scale: [1, Math.random() * 0.5 + 0.8, 1],
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: Math.random() * 5 + 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-[#1E2136]/90 backdrop-blur-md rounded-2xl p-6 w-full h-auto max-w-md shadow-2xl overflow-hidden relative z-10 border border-white/10"
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="absolute top-0 right-0 left-0"
          >
            <motion.div 
              className="w-full h-[5px] bg-gradient-to-r from-purple-500 via-pink-500 to-red-500"
              animate={{ 
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{ 
                duration: 5, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              style={{ backgroundSize: "200% 200%" }}
            ></motion.div>
          </motion.div>
          
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex justify-center mb-6"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 flex items-center justify-center relative">
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500"
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
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
                className="bg-[#1E2136] rounded-full p-3 z-10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            </div>
          </motion.div>
          
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-3xl font-bold mb-4 text-white text-center"
          >
            Payment Successful!
          </motion.h1>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-[#a0a0c0] mb-8 text-center"
          >
            Your track is now available in your profile under "Downloads".
          </motion.p>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="space-y-4"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className={`${activeButton === 'profile' ? 'bg-white text-[#1E2136]' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'} font-bold py-3 px-4 rounded-xl w-full transition-all duration-300 shadow-lg relative overflow-hidden`}
              onClick={handleNavigateHome}
              disabled={isNavigating}
            >
              <span className="relative z-10">Go to Profile</span>
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600"
                initial={{ x: "-100%" }}
                animate={{ x: activeButton === 'profile' ? "0%" : "-100%" }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className={`${activeButton === 'explore' ? 'bg-white text-[#1E2136]' : 'bg-[#2D2D44] hover:bg-[#3d3d5c] text-white'} font-bold py-3 px-4 rounded-xl w-full transition-all duration-300 relative overflow-hidden`}
              onClick={handleNavigateExplore}
              disabled={isNavigating}
            >
              <span className="relative z-10">Find More Tracks</span>
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600"
                initial={{ x: "-100%" }}
                animate={{ x: activeButton === 'explore' ? "0%" : "-100%" }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-xl"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 1 }}
            className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl"
          />
        </motion.div>
      </div>
    )
  }

  // Show loading state while user context initializes
  if (userContext === undefined) {
    return (
      <div className="flex justify-center items-center h-screen p-[20px]">
        <div className="bg-[#1E2136] rounded-2xl p-2 w-full max-w-md shadow-2xl">
          <div className="animate-pulse space-y-4">
            <div className="h-40 bg-gray-700 rounded-xl"></div>
            <div className="h-8 bg-gray-700 rounded-xl w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded-xl w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading || createPurchaseLoading) {
    return (
      <div className="flex justify-center items-center h-screen p-[20px]">
        <div className="bg-[#1E2136] rounded-2xl p-2 w-full max-w-md shadow-2xl">
          <div className="animate-pulse space-y-4">
            <div className="h-40 bg-gray-700 rounded-xl"></div>
            <div className="h-8 bg-gray-700 rounded-xl w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded-xl w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }
  
  // Only show error if we have an error and it's not a duplicate purchase
  if ((error || createPurchaseError) && !error?.includes('Purchase already exists') && !isProcessed) {
    return (
      <div className="flex justify-center items-center h-screen p-[20px] bg-gradient-to-b from-[#1a1a2e] to-[#16213e]">
        <AnimatePresence>
          {isNavigating && <MusicLoader />}
        </AnimatePresence>
        
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-gradient-to-r from-red-500/10 to-purple-500/10"
              style={{
                width: Math.random() * 100 + 50,
                height: Math.random() * 100 + 50,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                x: [0, Math.random() * 50 - 25],
                y: [0, Math.random() * 50 - 25],
                opacity: [0.1, 0.2, 0.1],
              }}
              transition={{
                duration: Math.random() * 5 + 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-[#1E2136]/90 backdrop-blur-md rounded-2xl p-6 w-full h-auto max-w-md shadow-2xl overflow-hidden relative z-10 border border-white/10"
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="absolute top-0 right-0 left-0"
          >
            <motion.div 
              className="w-full h-[5px] bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500"
              animate={{ 
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{ 
                duration: 5, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              style={{ backgroundSize: "200% 200%" }}
            ></motion.div>
          </motion.div>
          
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex justify-center mb-6 mt-4"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center relative">
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 to-orange-500"
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
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
                className="bg-[#1E2136] rounded-full p-3 z-10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.div>
            </div>
          </motion.div>
          
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-2xl font-bold mb-4 text-white text-center"
          >
            Oops, Something Went Wrong!
          </motion.h1>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-[#a0a0c0] mb-6 text-center"
          >
            {error || createPurchaseError?.message}
          </motion.p>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className={`${activeButton === 'profile' ? 'bg-white text-[#1E2136]' : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white'} font-bold py-3 px-4 rounded-xl w-full transition-all duration-300 shadow-lg relative overflow-hidden`}
              onClick={handleNavigateHome}
              disabled={isNavigating}
            >
              <span className="relative z-10">Back to Home</span>
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500"
                initial={{ x: "-100%" }}
                animate={{ x: activeButton === 'profile' ? "0%" : "-100%" }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20 blur-xl"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 1 }}
            className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-gradient-to-r from-yellow-500/20 to-red-500/20 blur-xl"
          />
        </motion.div>
      </div>
    )
  }
  
  // Показываем успешную страницу по умолчанию, если есть sessionId
  return (
    <div className="flex justify-center items-center h-screen p-[20px] bg-gradient-to-b from-[#1a1a2e] to-[#16213e]">
      <AnimatePresence>
        {isNavigating && <MusicLoader />}
      </AnimatePresence>
      
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10"
            style={{
              width: Math.random() * 100 + 50,
              height: Math.random() * 100 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, Math.random() * 50 - 25],
              y: [0, Math.random() * 50 - 25],
              scale: [1, Math.random() * 0.5 + 0.8, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-[#1E2136]/90 backdrop-blur-md rounded-2xl p-6 w-full h-auto max-w-md shadow-2xl overflow-hidden relative z-10 border border-white/10"
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="absolute top-0 right-0 left-0"
        >
          <motion.div 
            className="w-full h-[5px] bg-gradient-to-r from-purple-500 via-pink-500 to-red-500"
            animate={{ 
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{ 
              duration: 5, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            style={{ backgroundSize: "200% 200%" }}
          ></motion.div>
        </motion.div>
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex justify-center mb-6"
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 flex items-center justify-center relative">
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500"
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
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
              className="bg-[#1E2136] rounded-full p-3 z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
          </div>
        </motion.div>
        
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-3xl font-bold mb-4 text-white text-center"
        >
          Payment Successful!
        </motion.h1>
        
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-[#a0a0c0] mb-8 text-center"
        >
          Your track is now available in your profile under "Downloads".
        </motion.p>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="space-y-4"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className={`${activeButton === 'profile' ? 'bg-white text-[#1E2136]' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'} font-bold py-3 px-4 rounded-xl w-full transition-all duration-300 shadow-lg relative overflow-hidden`}
            onClick={handleNavigateHome}
            disabled={isNavigating}
          >
            <span className="relative z-10">Go to Profile</span>
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600"
              initial={{ x: "-100%" }}
              animate={{ x: activeButton === 'profile' ? "0%" : "-100%" }}
              transition={{ duration: 0.3 }}
            />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className={`${activeButton === 'explore' ? 'bg-white text-[#1E2136]' : 'bg-[#2D2D44] hover:bg-[#3d3d5c] text-white'} font-bold py-3 px-4 rounded-xl w-full transition-all duration-300 relative overflow-hidden`}
            onClick={handleNavigateExplore}
            disabled={isNavigating}
          >
            <span className="relative z-10">Find More Tracks</span>
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600"
              initial={{ x: "-100%" }}
              animate={{ x: activeButton === 'explore' ? "0%" : "-100%" }}
              transition={{ duration: 0.3 }}
            />
          </motion.button>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-xl"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 1 }}
          className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl"
        />
      </motion.div>
    </div>
  )
}  