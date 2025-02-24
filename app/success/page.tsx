"use client";

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@/app/context/user';
import ClientOnly from '@/app/components/ClientOnly';
import TopNav from '@/app/layouts/includes/TopNav';
import toast from 'react-hot-toast';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userContext = useUser();

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        toast.error('Invalid session');
        router.push('/');
        return;
      }

      try {
        const response = await fetch(`/api/stripe/verify-session?session_id=${sessionId}`);
        const data = await response.json();

        if (data.success) {
          toast.success('Purchase successful!');
          // Редирект на страницу профиля через 2 секунды
          setTimeout(() => {
            router.push(`/profile/${userContext?.user?.id}`);
          }, 2000);
        } else {
          toast.error('Payment verification failed');
          router.push('/');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        toast.error('Payment verification failed');
        router.push('/');
      }
    };

    if (userContext?.user?.id) {
      verifyPayment();
    }
  }, [userContext?.user?.id]);

  return (
    <ClientOnly>
      <TopNav params={{ userId: userContext?.user?.id as string }} />
      <div className="flex items-center justify-center min-h-screen bg-[#1A2338]">
        <div className="bg-[#272B43] p-8 rounded-2xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#20DDBB] rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl">✓</span>
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Payment Successful!</h2>
          <p className="text-[#838383]">Thank you for your purchase. Redirecting to your profile...</p>
        </div>
      </div>
    </ClientOnly>
  );
}  