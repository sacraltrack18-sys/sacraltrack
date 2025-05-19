import { useState } from "react";
import TextInput from "../TextInput";
import { ShowErrorObject } from "@/app/types";
import { useUser } from "@/app/context/user";
import { useGeneralStore } from "@/app/stores/general";
import { BiLoaderCircle } from "react-icons/bi";
import { FcGoogle } from "react-icons/fc";
import { FiMail, FiUser, FiLock, FiX, FiEye, FiEyeOff } from "react-icons/fi";
import { BsMusicNoteBeamed } from "react-icons/bs";
import { motion, AnimatePresence } from "framer-motion";
import { account } from '@/libs/AppWriteClient';
import { toast } from "react-hot-toast";
import { clearUserCache } from '@/app/utils/cacheUtils';

const backgroundAnimation = {
    initial: { backgroundPosition: "0% 50%" },
    animate: { 
        backgroundPosition: ["0% 50%", "100% 50%"],
        transition: { duration: 20, repeat: Infinity, repeatType: "reverse" }
    }
};

export default function Register() {
    const { setIsLoginOpen, setIsRegisterOpen } = useGeneralStore();
    const contextUser = useUser();

    const [loading, setLoading] = useState<boolean>(false);
    const [name, setName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [error, setError] = useState<ShowErrorObject | null>(null);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [lastAttemptTime, setLastAttemptTime] = useState<number>(0);

    const showError = (type: string) => {
        if (error && Object.entries(error).length > 0 && error?.type == type) {
            return error.message;
        }
        return '';
    }

    const validate = () => {
        setError(null);
        let isError = false;

        if (!name) {
            setError({ type: 'name', message: 'Name is required' });
            isError = true;
        } else if (!email) {
            setError({ type: 'email', message: 'Email is required' });
            isError = true;
        } else if (!password) {
            setError({ type: 'password', message: 'Password is required' });
            isError = true;
        } else if (password !== confirmPassword) {
            setError({ type: 'confirmPassword', message: 'Passwords do not match' });
            isError = true;
        } else if (password.length < 8) {
            setError({ type: 'password', message: 'Password must be at least 8 characters' });
            isError = true;
        }
        return isError;
    }

    const handleGoogleRegister = async () => {
        // Prevent multiple click attempts
        if (loading) return;
        
        try {
            setLoading(true);
            
            // Enhanced mobile browser detection
            const userAgent = navigator.userAgent;
            const isMobileSafari = /iPhone|iPad|iPod/.test(userAgent) && /AppleWebKit/.test(userAgent) && !userAgent.includes('CriOS');
            const isMobileFirefox = /Android/.test(userAgent) && /Firefox/.test(userAgent);
            const isMobileChrome = /Android/.test(userAgent) && /Chrome/.test(userAgent);
            
            // More accurate Safari detection
            const isDesktopSafari = /^((?!chrome|android).)*safari/i.test(userAgent) && 
                                    /AppleWebKit/.test(userAgent) &&
                                    !userAgent.includes('Chrome') &&
                                    !userAgent.includes('Chromium');
                                    
            const isIOS = /iPad|iPhone|iPod/.test(userAgent) || 
                         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            const needsEnhancedAuth = isIOS || isMobileSafari || isMobileFirefox || isDesktopSafari; // Apply enhanced flow to these browsers
            
            // Check for existing Google auth in progress and clear it if it exists
            if (typeof window !== 'undefined') {
                // If there's a stale flag, clear it first
                if (sessionStorage.getItem('googleAuthInProgress')) {
                    console.log('Clearing existing googleAuthInProgress flag');
                    sessionStorage.removeItem('googleAuthInProgress');
                    // Brief pause to ensure browser state is updated
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                // Set a new flag
                sessionStorage.setItem('googleAuthInProgress', 'true');
                
                // Set an expiration timestamp - to prevent stale state
                const expiryTime = Date.now() + (5 * 60 * 1000); // 5 minutes
                sessionStorage.setItem('googleAuthExpiryTime', expiryTime.toString());
                
                // Store browser information for debugging
                sessionStorage.setItem('authBrowserInfo', JSON.stringify({
                    isMobileSafari,
                    isMobileFirefox,
                    isMobileChrome,
                    isDesktopSafari,
                    isIOS,
                    userAgent: userAgent.substring(0, 200) // Store partial UA to avoid large storage
                }));
            }
            
            // Проверяем наличие необходимых переменных окружения
            if (!process.env.NEXT_PUBLIC_APP_URL) {
                throw new Error('APP_URL configuration is missing');
            }
            
            if (!process.env.NEXT_PUBLIC_APPWRITE_URL) {
                throw new Error('APPWRITE_URL configuration is missing');
            }

            // Закрываем форму регистрации перед редиректом
            setIsRegisterOpen(false);

            // Double-check that we're properly clearing any existing session
            try {
                console.log('Checking for existing session to clean up');
                const session = await account.getSession('current');
                if (session) {
                    console.log('Found existing session, deleting it');
                    await account.deleteSession('current');
                    // Brief pause to ensure session is cleared
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            } catch (sessionError) {
                // If there's no session or we can't access it, that's fine
                console.log('No existing session found or no access to check');
            }

            // Формируем URL для перенаправления - ensure they're properly encoded
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, '');
            const successUrl = encodeURI(`${baseUrl}/auth/google/success`);
            const failureUrl = encodeURI(`${baseUrl}/auth/google/fail`);

            console.log('Starting OAuth2 session with Google');
            console.log('Success URL:', successUrl);
            console.log('Failure URL:', failureUrl);
            
            // Clear any existing toast notifications
            toast.dismiss();
            
            // Show a toast indicating redirection
            toast.success('Redirecting to Google login...', {
                duration: 3000,
                style: {
                    background: '#272B43',
                    color: '#fff',
                    borderLeft: '4px solid #20DDBB'
                }
            });
            
            // Add a short delay to ensure toast is displayed before redirect
            await new Promise(resolve => setTimeout(resolve, 500));

            // Special handling for mobile browsers that need enhanced auth
            if (needsEnhancedAuth) {
                console.log('Mobile browser detected, using enhanced OAuth flow for registration');
                
                try {
                    // Construct the OAuth URL manually for more reliable mobile browser handling
                    const appwriteEndpoint = process.env.NEXT_PUBLIC_APPWRITE_URL || 'https://cloud.appwrite.io/v1';
                    const projectId = process.env.NEXT_PUBLIC_ENDPOINT || '';
                    
                    const oauthUrl = `${appwriteEndpoint}/account/sessions/oauth2/google?` + 
                                    `project=${projectId}&` +
                                    `success=${encodeURIComponent(successUrl)}&` +
                                    `failure=${encodeURIComponent(failureUrl)}`;
                    
                    // Navigate directly to the OAuth URL
                    window.location.href = oauthUrl;
                    
                    // No need for the appwrite call on these browsers since we're using direct URL navigation
                } catch (error) {
                    console.error('Error starting OAuth session on mobile browser:', error);
                    
                    // Clear the Google auth in progress flag
                    if (typeof window !== 'undefined') {
                        sessionStorage.removeItem('googleAuthInProgress');
                        sessionStorage.removeItem('googleAuthExpiryTime');
                        sessionStorage.removeItem('authBrowserInfo');
                    }
                    
                    toast.error('Failed to start authentication. Please try again with email registration.', {
                        duration: 5000,
                        style: {
                            background: '#272B43',
                            color: '#fff',
                            borderLeft: '4px solid #EF4444'
                        }
                    });
                    
                    setLoading(false);
                }
            } else {
                // Standard flow for desktop browsers
                try {
                    // Создаем OAuth сессию - после этого произойдет редирект
                    await account.createOAuth2Session(
                        'google',
                        successUrl,
                        failureUrl
                    );
                    
                    // This code should not execute due to redirect, but keep it as a fallback
                    console.log('OAuth2 session created, redirect should have occurred');
                } catch (error) {
                    console.error('Google registration error:', error);
                    
                    // Clear the Google auth in progress flag
                    if (typeof window !== 'undefined') {
                        sessionStorage.removeItem('googleAuthInProgress');
                        sessionStorage.removeItem('googleAuthExpiryTime');
                        sessionStorage.removeItem('authBrowserInfo');
                    }
                    
                    // More specific error handling
                    let errorMessage = 'Failed to start Google authentication. Please try again later.';
                    
                    if (error.code === 400) {
                        errorMessage = 'Invalid OAuth configuration. Please contact support.';
                    } else if (error.code === 401) {
                        errorMessage = 'Authentication failed. Please try again.';
                    } else if (error.code === 429) {
                        errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
                    } else if (error.code === 503) {
                        errorMessage = 'Google authentication service is temporarily unavailable. Please try again later.';
                    } else if (error.message && error.message.includes('network')) {
                        errorMessage = 'Network error. Please check your internet connection and try again.';
                    }
                    
                    toast.error(errorMessage, {
                        duration: 5000,
                        style: {
                            background: '#272B43',
                            color: '#fff',
                            borderLeft: '4px solid #EF4444'
                        }
                    });
                    
                    setLoading(false);
                }
            }
        } catch (error) {
            console.error('Google registration error:', error);
            
            // Clear the Google auth in progress flag
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('googleAuthInProgress');
                sessionStorage.removeItem('googleAuthExpiryTime');
                sessionStorage.removeItem('authBrowserInfo');
            }
            
            // More specific error handling
            let errorMessage = 'Failed to start Google authentication. Please try again later.';
            
            if (error.code === 400) {
                errorMessage = 'Invalid OAuth configuration. Please contact support.';
            } else if (error.code === 401) {
                errorMessage = 'Authentication failed. Please try again.';
            } else if (error.code === 429) {
                errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
            } else if (error.code === 503) {
                errorMessage = 'Google authentication service is temporarily unavailable. Please try again later.';
            } else if (error.message && error.message.includes('network')) {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            }
            
            toast.error(errorMessage, {
                duration: 5000,
                style: {
                    background: '#272B43',
                    color: '#fff',
                    borderLeft: '4px solid #EF4444'
                }
            });
            
            // Suggest email registration instead
            toast((t) => (
                <div className="flex items-center gap-4">
                    <span>Try regular email registration instead</span>
                    <button
                        onClick={() => {
                            toast.dismiss(t.id);
                        }}
                        className="px-4 py-2 bg-[#20DDBB] rounded-lg text-white hover:bg-[#1CB99A] transition-colors"
                    >
                        Continue
                    </button>
                </div>
            ), {
                duration: 8000,
                style: {
                    background: '#272B43',
                    color: '#fff', 
                    borderLeft: '4px solid #20DDBB'
                }
            });
            
            setLoading(false);
        }
    }

    const register = async () => {
        let isError = validate();
        if (isError) return;
        if (!contextUser) return;

        // Check if enough time has passed since the last attempt
        const now = Date.now();
        const timeSinceLastAttempt = now - lastAttemptTime;
        const requiredDelay = 10000; // 10 seconds delay between attempts (increased from 5000)

        if (timeSinceLastAttempt < requiredDelay) {
            const remainingTime = Math.ceil((requiredDelay - timeSinceLastAttempt) / 1000);
            toast.error(`Please wait ${remainingTime} seconds before trying again`, {
                duration: 3000,
                style: {
                    background: '#272B43',
                    color: '#fff',
                    borderLeft: '4px solid #EF4444'
                }
            });
            return;
        }

        try {
            setLoading(true);
            setLastAttemptTime(now);
            
            // Add retry logic with exponential backoff
            let retries = 0;
            const maxRetries = 3;
            let success = false;
            let lastError = null;
            
            while (retries < maxRetries && !success) {
                try {
                    if (retries > 0) {
                        // Wait with exponential backoff (1s, 2s, 4s)
                        const waitTime = Math.pow(2, retries - 1) * 1000;
                        console.log(`Registration attempt ${retries + 1}/${maxRetries}, waiting ${waitTime}ms before retry`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    }
                    
                    await contextUser.register(name, email, password);
                    success = true;
                } catch (err) {
                    lastError = err;
                    // Only retry if it's a rate limit or network error, not for validation errors
                    if (err.message && (err.message.includes('rate limit') || 
                                      err.message.includes('network') ||
                                      err.message.includes('too many attempts') ||
                                      err.message.includes('connection') ||
                                      err.message.includes('timeout'))) {
                        retries++;
                        console.log(`Registration attempt failed: ${err.message}. ${retries < maxRetries ? 'Will retry.' : 'Max retries reached.'}`);
                        
                        if (retries >= maxRetries) {
                            throw new Error(`Failed to authenticate after multiple retries: ${err.message}`);
                        }
                    } else {
                        // Don't retry for validation errors or other issues
                        throw err;
                    }
                }
            }
            
            setRegistrationSuccess(true);
            
            const verifyUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/verify` : 'https://sacraltrack.space/verify';
            
            try {
                await account.createVerification(verifyUrl);
                toast.success('Please check your email to verify your account', {
                    duration: 6000,
                    style: {
                        background: '#272B43',
                        color: '#fff',
                        borderLeft: '4px solid #20DDBB'
                    }
                });
            } catch (verificationError) {
                console.error('Error sending verification email:', verificationError);
                // Still show success even if verification email fails
                toast.success('Registration successful! Please check your email or try logging in.', {
                    duration: 6000,
                    style: {
                        background: '#272B43',
                        color: '#fff',
                        borderLeft: '4px solid #20DDBB'
                    }
                });
            }
            
            // Закрываем форму регистрации сразу после успешной регистрации
            setIsRegisterOpen(false);
        } catch (error: any) {
            console.error('Registration error:', error);
            setLoading(false);
            
            // Clear any Google auth in progress flag if it exists
            if (typeof window !== 'undefined' && window.sessionStorage) {
                window.sessionStorage.removeItem('googleAuthInProgress');
            }
            
            // Handle rate limit error specifically
            if (error.message && (error.message.includes('rate limit') || error.message.includes('too many attempts'))) {
                toast.error('Too many registration attempts. Please try again in a few minutes.', {
                    duration: 8000,
                    style: {
                        background: '#272B43',
                        color: '#fff',
                        borderLeft: '4px solid #EF4444'
                    }
                });
                return;
            }
            
            // Handle authentication failure errors
            if (error.message && error.message.includes('authenticate after multiple')) {
                toast.error('Authentication failed. Please try again later or use a different method.', {
                    duration: 8000,
                    style: {
                        background: '#272B43',
                        color: '#fff',
                        borderLeft: '4px solid #EF4444'
                    }
                });
                
                // Add a suggestion to use Google login instead
                toast((t) => (
                    <div className="flex items-center gap-4">
                        <span>Try signing in with Google instead</span>
                        <button
                            onClick={() => {
                                toast.dismiss(t.id);
                                handleGoogleRegister();
                            }}
                            className="px-4 py-2 bg-[#20DDBB] rounded-lg text-white hover:bg-[#1CB99A] transition-colors"
                        >
                            Google Login
                        </button>
                    </div>
                ), {
                    duration: 15000,
                    style: {
                        background: '#272B43',
                        color: '#fff',
                        borderLeft: '4px solid #20DDBB'
                    }
                });
                return;
            }

            // Handle session exists error
            if (error.message && error.message.includes('log out before creating')) {
                // Keep existing code for session exists error
                toast.error('Please log out of your current account before registering a new one', {
                    duration: 5000,
                    style: {
                        background: '#272B43',
                        color: '#fff',
                        borderLeft: '4px solid #EF4444'
                    }
                });

                // Add a logout button to the toast
                toast((t) => (
                    <div className="flex items-center gap-4">
                        <span>Already logged in.</span>
                        <button
                            onClick={async () => {
                                await contextUser.logout();
                                toast.dismiss(t.id);
                                // Try registration again after logout
                                register();
                            }}
                            className="px-4 py-2 bg-[#20DDBB] rounded-lg text-white hover:bg-[#1919A] transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                ), {
                    duration: 10000,
                    style: {
                        background: '#272B43',
                        color: '#fff',
                        borderLeft: '4px solid #20DDBB'
                    }
                });
                return;
            }
            
            // Display the specific error message from the user context
            const errorMessage = error.message || 'Registration failed. Please try again.';
            toast.error(errorMessage, {
                duration: 5000,
                style: {
                    background: '#272B43',
                    color: '#fff',
                    borderLeft: '4px solid #EF4444'
                }
            });

            // Set appropriate field error if we can identify it
            if (errorMessage.includes('email')) {
                setError({ type: 'email', message: errorMessage });
            } else if (errorMessage.includes('password')) {
                setError({ type: 'password', message: errorMessage });
            }
        }
    }

    const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            setIsRegisterOpen(false);
        }
    };

    const switchToLogin = () => {
        setIsLoginOpen(true);
    };

    return (
        <motion.div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClickOutside}
        >
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-[420px] relative"
            >
                <motion.div
                    className="relative w-full bg-[#1E1F2E] rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(32,221,187,0.15)]"
                    whileHover={{ boxShadow: '0 0 50px rgba(32,221,187,0.2)' }}
                >
                    {/* Close Button */}
                    <button 
                        onClick={() => setIsRegisterOpen(false)}
                        className="absolute top-4 right-4 z-10 text-[#818BAC] hover:text-white transition-colors duration-300"
                    >
                        <FiX className="text-2xl" />
                    </button>

                    {/* Gradient Border */}
                    <div className="absolute inset-0 p-[1.5px] rounded-3xl">
                        <motion.div 
                            className="absolute inset-0 bg-gradient-to-r from-[#20DDBB] via-[#8A2BE2] to-[#20DDBB] rounded-3xl"
                            style={{ backgroundSize: '200% 100%' }}
                            animate={{ 
                                backgroundPosition: ['0% 0%', '100% 0%', '0% 0%']
                            }}
                            transition={{ 
                                duration: 8,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                        />
                    </div>

                    <div className="relative p-8 bg-[#1E1F2E] rounded-[22px] m-[1.5px]">
                        <div className="text-center mb-8">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex justify-center mb-6"
                            >
                                <div className="relative w-20 h-20">
                                    <motion.div
                                        className="absolute inset-0 bg-[#20DDBB]/20 rounded-full blur-xl"
                                        animate={{ 
                                            opacity: [0.5, 0.8, 0.5]
                                        }}
                                        transition={{ 
                                            duration: 4,
                                            repeat: Infinity,
                                            repeatType: "reverse"
                                        }}
                                    />
                                    <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-[#20DDBB]/30">
                                        {/* Static placeholder that shows immediately */}
                                        <img 
                                            src="/images/placeholder-avatar.svg" 
                                            alt="Placeholder"
                                            className="absolute inset-0 w-full h-full object-contain p-2"
                                        />
                                        
                                        {/* Animated placeholder */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-[#20DDBB]/20 via-[#8A2BE2]/20 to-[#20DDBB]/20">
                                            <motion.div
                                                className="absolute inset-0"
                                                animate={{
                                                    background: [
                                                        "linear-gradient(0deg, rgba(32,221,187,0.2) 0%, rgba(138,43,226,0.2) 100%)",
                                                        "linear-gradient(360deg, rgba(32,221,187,0.2) 0%, rgba(138,43,226,0.2) 100%)"
                                                    ]
                                                }}
                                                transition={{
                                                    duration: 3,
                                                    repeat: Infinity,
                                                    repeatType: "reverse",
                                                    ease: "linear"
                                                }}
                                            />
                                            <motion.div
                                                className="absolute inset-0 flex items-center justify-center"
                                                animate={{ rotate: 360 }}
                                                transition={{
                                                    duration: 15,
                                                    repeat: Infinity,
                                                    ease: "linear"
                                                }}
                                            >
                                                <div className="w-12 h-12 border-t-2 border-[#20DDBB]/40 rounded-full" />
                                            </motion.div>
                                        </div>
                                        
                                        {/* Logo (if exists) */}
                                        <motion.img 
                                            src="/logo.png" 
                                            alt="Sacral Track"
                                            className="relative z-10 w-full h-full object-cover"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.3 }}
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                            <motion.h1 
                                className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] mb-3"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                Join Sacral Track
                            </motion.h1>
                            <motion.p 
                                className="text-[#818BAC]"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                Start your musical journey today
                            </motion.p>
                        </div>

                        <motion.div 
                            className="space-y-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="relative group">
                                <TextInput 
                                    string={name}
                                    placeholder="Name"
                                    onUpdate={setName}
                                    inputType="text"
                                    error={showError('name')}
                                    className={`
                                        w-full bg-[#14151F]/60 border-2 
                                        ${error?.type === 'name' ? 'border-red-500' : 'border-[#2A2B3F]'} 
                                        rounded-xl p-4 pl-12 text-white placeholder-[#818BAC]/50
                                        focus:border-[#20DDBB] focus:bg-[#14151F]/80
                                        transition-all duration-300
                                        group-hover:border-[#20DDBB]/50
                                    `}
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <FiUser className="text-[#818BAC] group-hover:text-[#20DDBB] transition-colors duration-300" />
                                </div>
                            </div>

                            <div className="relative group">
                                <TextInput 
                                    string={email}
                                    placeholder="Email"
                                    onUpdate={setEmail}
                                    inputType="email"
                                    error={showError('email')}
                                    className={`
                                        w-full bg-[#14151F]/60 border-2 
                                        ${error?.type === 'email' ? 'border-red-500' : 'border-[#2A2B3F]'} 
                                        rounded-xl p-4 pl-12 text-white placeholder-[#818BAC]/50
                                        focus:border-[#20DDBB] focus:bg-[#14151F]/80
                                        transition-all duration-300
                                        group-hover:border-[#20DDBB]/50
                                    `}
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <FiMail className="text-[#818BAC] group-hover:text-[#20DDBB] transition-colors duration-300" />
                                </div>
                            </div>

                            <div className="relative group">
                                <TextInput 
                                    string={password}
                                    placeholder="Password"
                                    onUpdate={setPassword}
                                    inputType={showPassword ? "text" : "password"}
                                    error={showError('password')}
                                    className={`
                                        w-full bg-[#14151F]/60 border-2 
                                        ${error?.type === 'password' ? 'border-red-500' : 'border-[#2A2B3F]'} 
                                        rounded-xl p-4 pl-12 pr-12 text-white placeholder-[#818BAC]/50
                                        focus:border-[#20DDBB] focus:bg-[#14151F]/80
                                        transition-all duration-300
                                        group-hover:border-[#20DDBB]/50
                                    `}
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <FiLock className="text-[#818BAC] group-hover:text-[#20DDBB] transition-colors duration-300" />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#818BAC] hover:text-[#20DDBB] transition-colors duration-300"
                                >
                                    {showPassword ? (
                                        <FiEyeOff className="text-xl" />
                                    ) : (
                                        <FiEye className="text-xl" />
                                    )}
                                </button>
                            </div>

                            <div className="relative group">
                                <TextInput 
                                    string={confirmPassword}
                                    placeholder="Confirm Password"
                                    onUpdate={setConfirmPassword}
                                    inputType={showConfirmPassword ? "text" : "password"}
                                    error={showError('confirmPassword')}
                                    className={`
                                        w-full bg-[#14151F]/60 border-2 
                                        ${error?.type === 'confirmPassword' ? 'border-red-500' : 'border-[#2A2B3F]'} 
                                        rounded-xl p-4 pl-12 pr-12 text-white placeholder-[#818BAC]/50
                                        focus:border-[#20DDBB] focus:bg-[#14151F]/80
                                        transition-all duration-300
                                        group-hover:border-[#20DDBB]/50
                                    `}
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <FiLock className="text-[#818BAC] group-hover:text-[#20DDBB] transition-colors duration-300" />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#818BAC] hover:text-[#20DDBB] transition-colors duration-300"
                                >
                                    {showConfirmPassword ? (
                                        <FiEyeOff className="text-xl" />
                                    ) : (
                                        <FiEye className="text-xl" />
                                    )}
                                </button>
                            </div>
                        </motion.div>

                        <motion.div 
                            className="mt-8 space-y-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <button 
                                disabled={loading}
                                onClick={register}
                                className="
                                    relative w-full bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] 
                                    text-white py-4 rounded-xl font-semibold
                                    overflow-hidden group
                                "
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                <div className="relative flex items-center justify-center gap-2">
                                    {loading ? (
                                        <BiLoaderCircle className="animate-spin text-2xl" />
                                    ) : (
                                        <>
                                            <span>Create Account</span>
                                            <motion.div
                                                animate={{ x: [0, 5, 0] }}
                                                transition={{ duration: 1, repeat: Infinity }}
                                            >
                                                →
                                            </motion.div>
                                        </>
                                    )}
                                </div>
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-[#2A2B3F]"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 text-[#818BAC] bg-[#1E1F2E]">Or continue with</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <button 
                                    onClick={handleGoogleRegister}
                                    disabled={loading}
                                    className="
                                        flex items-center justify-center gap-3 px-4 py-3
                                        bg-[#14151F]/60 hover:bg-[#14151F]/80
                                        text-white rounded-xl font-medium
                                        border-2 border-[#2A2B3F] hover:border-[#20DDBB]/50
                                        transition-all duration-300
                                    "
                                >
                                    <FcGoogle className="text-xl" />
                                    <span>Google</span>
                                </button>
                            </div>
                        </motion.div>

                        <motion.div 
                            className="mt-6 text-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                        >
                            <p className="text-[#818BAC] text-sm">
                                Already have an account?{' '}
                                <button 
                                    onClick={switchToLogin}
                                    className="text-[#20DDBB] hover:text-[#8A2BE2] transition-colors duration-300 font-medium"
                                >
                                    Log in
                                </button>
                            </p>
                            
                            {/* Troubleshooting section */}
                            <div className="mt-4 text-xs">
                                <button 
                                    onClick={() => {
                                        clearUserCache();
                                        toast.success('Authentication state cleared. Please try again.', {
                                            duration: 3000,
                                            style: {
                                                background: '#272B43',
                                                color: '#fff',
                                                borderLeft: '4px solid #20DDBB'
                                            }
                                        });
                                    }}
                                    className="text-[#818BAC] hover:text-[#20DDBB] text-xs underline transition-colors duration-300"
                                >
                                    Having trouble? Click here to clear auth state
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </motion.div>

            <AnimatePresence>
                {registrationSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed bottom-8 right-8 bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] text-white p-6 rounded-2xl shadow-lg backdrop-blur-xl"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg">
                                <BsMusicNoteBeamed className="text-xl" />
                            </div>
                            <p>Welcome to Sacral Track! Check your email to verify your account.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
