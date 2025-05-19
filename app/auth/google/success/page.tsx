'use client';

import GoogleAuthSuccess from '@/app/components/auth/GoogleAuthSuccess';
import { useEffect } from 'react';

export default function GoogleAuthSuccessPage() {
    useEffect(() => {
        // Check if this is a Safari browser
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        if (isSafari) {
            console.log('Safari browser detected on auth success page, applying special handling');
            
            // Store info about the auth attempt in local storage
            localStorage.setItem('safariAuthProcessing', 'true');
            localStorage.setItem('safariAuthTimestamp', Date.now().toString());
            
            // Safari-specific cookie issues can be complex
            // We'll set a flag that the app can check later
            sessionStorage.setItem('safariAuthRedirected', 'true');
        }
    }, []);

    return <GoogleAuthSuccess />;
} 