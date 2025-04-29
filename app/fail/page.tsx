'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function AuthFailPage() {
    const router = useRouter();

    useEffect(() => {
        // Clear the OAuth in progress flag
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('googleAuthInProgress');
        }

        // Show a friendly error message
        toast.error('Authentication failed. Please try again.', {
            duration: 5000
        });

        // Redirect back to home page after a short delay
        const timer = setTimeout(() => {
            router.push('/');
        }, 3000);

        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#0F1122] to-[#1A1B2F] text-white px-4">
            <div className="w-full max-w-md p-8 space-y-8 bg-[#1E1F2E] rounded-2xl shadow-2xl">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold">Authentication Failed</h2>
                    <p className="mt-2 text-sm text-[#818BAC]">
                        We couldn't complete the authentication process.
                    </p>
                </div>
                <div className="mt-8 space-y-4">
                    <p className="text-center text-[#818BAC]">
                        You will be redirected to the home page in a few seconds.
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full py-3 px-4 rounded-xl bg-[#20DDBB] hover:bg-[#20DDBB]/90 text-[#121212] font-medium transition-all duration-300"
                    >
                        Go to Home Page
                    </button>
                </div>
            </div>
        </div>
    );
} 