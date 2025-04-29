"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// Component that uses search params, wrapped in Suspense
function CheckoutRedirectContent() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Preparing your checkout...');
  const [error, setError] = useState<string | null>(null);
  const [countDown, setCountDown] = useState(5);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const sessionUrl = searchParams.get('session_url');

    if (sessionUrl) {
      // Direct URL provided - redirect immediately
      setMessage('Redirecting to payment page...');
      try {
        window.location.href = decodeURIComponent(sessionUrl);
      } catch (error) {
        console.error('Failed to redirect with direct URL:', error);
        setError('Failed to redirect to payment page. Please try again.');
      }
    } else if (sessionId) {
      // Session ID provided - fetch the session details
      const fetchSessionUrl = async () => {
        try {
          setMessage('Retrieving your payment session...');
          const response = await fetch(`/api/get-checkout-session?session_id=${sessionId}`);
          const data = await response.json();
          
          if (data.success && data.session?.url) {
            setMessage('Redirecting to payment page...');
            window.location.href = data.session.url;
          } else {
            throw new Error(data.error || 'Failed to get session URL');
          }
        } catch (error) {
          console.error('Error retrieving session:', error);
          setError('There was a problem preparing your checkout. Please try again.');
        }
      };
      
      fetchSessionUrl();
    } else {
      setError('Missing session information. Please go back and try again.');
    }
    
    // Countdown for manual action if automatic redirect fails
    const interval = setInterval(() => {
      setCountDown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-[#24183d] to-[#351E43] p-4">
      <div className="max-w-md w-full bg-[#2E2469] rounded-xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="text-[#20DDBB] text-3xl font-bold">SacralTrack</div>
          </div>
          
          {error ? (
            <div className="text-center">
              <div className="text-red-400 text-xl font-semibold mb-4">
                {error}
              </div>
              <p className="text-white/70 mb-6">
                If you were trying to make a purchase, please try again or contact support.
              </p>
              <a 
                href="/"
                className="inline-block bg-gradient-to-r from-[#20DDBB] to-[#018CFD] text-white px-6 py-3 rounded-xl font-medium"
              >
                Return to Home
              </a>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-white text-xl font-semibold mb-4">
                {message}
              </div>
              
              <div className="relative h-2 bg-[#39316A] rounded-full overflow-hidden mb-6">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#20DDBB] to-[#018CFD] animate-pulse"
                  style={{ width: '70%' }}
                ></div>
              </div>
              
              <p className="text-white/70 mb-6">
                You should be redirected automatically. 
                If nothing happens after {countDown} seconds, please click the button below.
              </p>
              
              <a 
                href="/"
                className="inline-block bg-white/10 text-white border border-white/20 px-6 py-3 rounded-xl font-medium hover:bg-white/20 transition-colors"
              >
                Return to Home
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-[#24183d] to-[#351E43] p-4">
      <div className="max-w-md w-full bg-[#2E2469] rounded-xl shadow-2xl overflow-hidden">
        <div className="p-8 text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="text-[#20DDBB] text-3xl font-bold">SacralTrack</div>
          </div>
          <div className="text-white text-xl font-semibold mb-4">
            Loading checkout...
          </div>
          <div className="relative h-2 bg-[#39316A] rounded-full overflow-hidden mb-6">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#20DDBB] to-[#018CFD] animate-pulse"
              style={{ width: '70%' }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense
export default function CheckoutRedirect() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CheckoutRedirectContent />
    </Suspense>
  );
} 