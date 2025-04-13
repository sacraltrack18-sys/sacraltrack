"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FaCheckCircle, FaExclamationCircle, FaEnvelope } from "react-icons/fa";
import { account } from "@/libs/AppWriteClient";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";

// Выделяем основной функционал в отдельный клиентский компонент
function VerifyEmail() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const userId = searchParams.get("userId");
        const secret = searchParams.get("secret");
        // Получаем referrer и флаг для открытия следующего шага
        const referrer = searchParams.get("referrer") || "";
        const nextStep = searchParams.get("nextStep") === "true";
        
        if (!userId || !secret) {
          setError("Invalid verification link. Missing required parameters.");
          setLoading(false);
          return;
        }
        
        // Подтверждаем верификацию email через Appwrite
        await account.updateVerification(userId, secret);
        
        // Если успешно, отмечаем успех
        setSuccess(true);
        setLoading(false);
        toast.success("Your email has been successfully verified!");
        
        // Определяем, куда редиректить пользователя
        const redirectTo = referrer === "royalty" 
          ? "/royalty?emailVerified=true" // Меняем параметр verifyPhone на emailVerified
          : "/";
        
        console.log(`Email verified successfully. Redirecting to: ${redirectTo}`);
        
        // Через 2 секунды перенаправляем на нужную страницу
        setTimeout(() => {
          router.push(redirectTo);
        }, 2000);
      } catch (error: any) {
        console.error("Error verifying email:", error);
        setError(error.message || "Failed to verify your email. Please try again.");
        setLoading(false);
      }
    };
    
    verifyEmail();
  }, [searchParams, router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A2338] text-white px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full p-8 bg-[#252742] rounded-xl shadow-2xl border border-purple-500/20"
      >
        <div className="text-center">
          <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-full bg-gradient-to-r from-[#3f2d63]/30 to-[#4e377a]/30 mb-6">
            {loading ? (
              <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full" />
            ) : success ? (
              <FaCheckCircle className="text-green-400 text-4xl" />
            ) : (
              <FaExclamationCircle className="text-red-400 text-4xl" />
            )}
          </div>
          
          <h1 className="text-2xl font-bold mb-4">
            {loading 
              ? "Verifying your email..." 
              : success 
                ? "Email Verified!" 
                : "Verification Failed"}
          </h1>
          
          <div className="mb-6 text-[#9BA3BF]">
            {loading ? (
              <p>Please wait while we verify your email address...</p>
            ) : success ? (
              <>
                <p className="mb-2">Your email has been successfully verified.</p>
                <p>You will be redirected {searchParams.get("referrer") === "royalty" ? "to the royalty page" : "to the home page"} shortly.</p>
                {searchParams.get("referrer") === "royalty" && (
                  <p className="mt-2 text-violet-300">Next step: Verify your phone number</p>
                )}
              </>
            ) : (
              <p className="text-red-300">{error}</p>
            )}
          </div>
          
          {!loading && !success && (
            <button 
              onClick={() => router.push(searchParams.get("referrer") === "royalty" ? "/royalty" : "/")}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#3f2d63] to-[#4e377a] rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/20 transition-all"
            >
              {searchParams.get("referrer") === "royalty" ? "Return to Royalty Dashboard" : "Return to Home"}
            </button>
          )}
          
          {!loading && success && (
            <div className="w-full mt-4 flex justify-center">
              <div className="animate-pulse flex items-center text-green-400 gap-2">
                <span>Redirecting</span>
                <span className="flex gap-1">
                  <span className="animate-bounce delay-0">.</span>
                  <span className="animate-bounce delay-150">.</span>
                  <span className="animate-bounce delay-300">.</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Загрузочный UI, который будет показан во время Suspense
function VerifyEmailFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A2338] text-white px-4">
      <div className="max-w-md w-full p-8 bg-[#252742] rounded-xl shadow-2xl border border-purple-500/20">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-full bg-gradient-to-r from-[#3f2d63]/30 to-[#4e377a]/30 mb-6">
            <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    </div>
  );
}

// Основной компонент страницы, который оборачивает пользовательский компонент в Suspense
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmail />
    </Suspense>
  );
} 