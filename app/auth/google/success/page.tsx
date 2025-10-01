'use client';

import GoogleAuthSuccess from '@/app/components/auth/GoogleAuthSuccess';
import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { account } from '@/libs/AppWriteClient';

// Component that uses useSearchParams (must be wrapped in Suspense)
function AuthParamsHandler() {
    const searchParams = useSearchParams();
    
    useEffect(() => {
        // Check if this is a Safari or Firefox browser
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isFirefox = /firefox/i.test(navigator.userAgent);
        
        if (isSafari || isFirefox) {
            console.log(`${isSafari ? 'Safari' : 'Firefox'} browser detected on auth success page, applying special handling`);
            
            // For Safari/Firefox, check if we have tokens in URL params (happens when useQueryForSuccessUrl=true)
            const sessionId = searchParams?.get('session');
            const userId = searchParams?.get('userId');
            
            if (sessionId) {
                console.log('Session ID found in URL parameters:', sessionId);
                
                // Store these values to help with authentication
                localStorage.setItem('browserAuthSessionId', sessionId);
                
                if (userId) {
                    localStorage.setItem('userId', userId);
                    console.log('User ID found in URL parameters:', userId);
                }
                
                // Try to help restore the session by making a direct API call
                (async () => {
                    try {
                        // This might help Safari/Firefox restore the session
                        const result = await account.get();
                        console.log('Account get successful after URL param extraction:', result.$id);
                    } catch (error) {
                        console.error('Error getting account after URL param extraction:', error);
                    }
                })();
            }
            
            // Store info about the auth attempt in localStorage for debugging and handling
            localStorage.setItem('browserAuthProcessing', 'true');
            localStorage.setItem('browserAuthTimestamp', Date.now().toString());
            localStorage.setItem('browserAuthUserAgent', navigator.userAgent.substring(0, 200));
            
            // Set a sessionStorage flag that the app can check later
            sessionStorage.setItem('browserAuthRedirected', 'true');
        }
    }, [searchParams]);
    
    return null; // This component just handles the parameters, doesn't render anything
}

// Main page component that doesn't directly use useSearchParams
export default function GoogleAuthSuccessPage() {
    return (
        <>
            {/* Wrap the component using useSearchParams in Suspense */}
            <Suspense fallback={<div className="text-center p-4">Loading authentication parameters...</div>}>
                <AuthParamsHandler />
            </Suspense>
            <GoogleAuthSuccess />
        </>
    );
} 