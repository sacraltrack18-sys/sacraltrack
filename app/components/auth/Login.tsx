import TextInput from "../TextInput";
import { useState, useEffect } from "react";
import { ShowErrorObject } from "@/app/types";
import { useUser } from "@/app/context/user";
import { useGeneralStore } from "@/app/stores/general";
import { BiLoaderCircle } from "react-icons/bi";
import { FcGoogle } from "react-icons/fc";
import { FiMail, FiLock, FiX, FiEye, FiEyeOff } from "react-icons/fi";
import { BsMusicNoteBeamed } from "react-icons/bs";
import { motion, AnimatePresence } from "framer-motion";
import { account } from '@/libs/AppWriteClient';
import { toast } from "react-hot-toast";

export default function Login() {
    const { setIsLoginOpen, setIsRegisterOpen } = useGeneralStore();
    const contextUser = useUser();

    const [loading, setLoading] = useState<boolean>(false);
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<ShowErrorObject | null>(null);
    const [isEmailSent, setIsEmailSent] = useState(false);
    const [showRegister, setShowRegister] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);

    const showError = (type: string) => {
        if (error && Object.entries(error).length > 0 && error?.type == type) {
            return error.message;
        }
        return '';
    }

    const validate = () => {
        setError(null);
        let isError = false;

        if (!email) {
            setError({ type: 'email', message: 'Email is required' });
            isError = true;
        } else if (!password) {
            setError({ type: 'password', message: 'Password is required' });
            isError = true;
        }
        return isError;
    }

    const handleGoogleLogin = async () => {
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
            
            // Set a flag in sessionStorage to prevent showing errors during redirect
            if (typeof window !== 'undefined') {
                // Clear any existing flags first
                sessionStorage.removeItem('googleAuthInProgress');
                sessionStorage.removeItem('googleAuthExpiryTime');
                
                // Set fresh flags
                sessionStorage.setItem('googleAuthInProgress', 'true');
                
                // Set a timestamp to auto-clear the flag after 5 minutes
                const expiryTime = Date.now() + (5 * 60 * 1000);
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
            
            // Use environment variables for URLs or fallback to localhost
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const successUrl = `${appUrl}/auth/google/success`;
            const failureUrl = `${appUrl}/fail`;

            // Check if Appwrite endpoint is configured
            if (!process.env.NEXT_PUBLIC_APPWRITE_URL) {
                toast.error('Authentication service configuration is missing. Please contact support.');
                throw new Error('Appwrite configuration is missing');
            }

            // Close login form before OAuth redirection
            setIsLoginOpen(false);

            // Check for existing session
            try {
                const session = await account.getSession('current');
                if (session) {
                    console.log('Existing session found, redirecting to homepage');
                    window.location.href = '/';
                    return;
                }
            } catch (sessionError) {
                // No session exists, proceed with OAuth
                console.log('No existing session found, proceeding with OAuth');
            }

            // Show toast notification that we're redirecting to Google
            toast.loading('Redirecting to Google login...', {
                id: 'google-redirect',
                duration: 3000
            });

            // Special handling for mobile browsers that need enhanced auth
            if (needsEnhancedAuth) {
                console.log('Browser requiring enhanced auth detected, using direct OAuth flow');
                
                // Use a more reliable direct URL approach for problematic browsers
                try {
                    // Construct the OAuth URL manually with specific parameters for better cookie handling
                    const appwriteEndpoint = process.env.NEXT_PUBLIC_APPWRITE_URL || 'https://cloud.appwrite.io/v1';
                    const projectId = process.env.NEXT_PUBLIC_ENDPOINT || '';
                    
                    // Force the session cookie to be set with SameSite=None and Secure
                    // This helps with cross-site cookies in Safari and Firefox
                    const cookieParams = 'cookieSameSite=none&cookieSecure=true';
                    
                    // Add browser-specific parameters
                    const browserParams = isDesktopSafari || isMobileSafari ? 
                                          '&forceRedirect=true&useQueryForSuccessUrl=true' : '';
                    
                    // Construct full OAuth URL with all parameters
                    const oauthUrl = `${appwriteEndpoint}/account/sessions/oauth2/google?` + 
                                    `project=${projectId}&` +
                                    `success=${encodeURIComponent(successUrl)}&` +
                                    `failure=${encodeURIComponent(failureUrl)}&` +
                                    `${cookieParams}${browserParams}`;
                    
                    console.log('Using enhanced OAuth URL with explicit cookie parameters');
                    
                    // For Safari, clear any existing cookies that might interfere
                    if (isDesktopSafari || isMobileSafari) {
                        console.log('Safari browser detected, applying additional fixes');
                        localStorage.setItem('authRedirectAttempt', Date.now().toString());
                    }
                    
                    // Navigate directly to the OAuth URL
                    window.location.href = oauthUrl;
                    
                } catch (error) {
                    console.error('Error starting OAuth session on mobile browser:', error);
                    toast.error('Failed to start authentication. Please try again.');
                    setLoading(false);
                    
                    // Clear the authentication progress flag
                    if (typeof window !== 'undefined') {
                        sessionStorage.removeItem('googleAuthInProgress');
                        sessionStorage.removeItem('googleAuthExpiryTime');
                        sessionStorage.removeItem('authBrowserInfo');
                    }
                }
            } else {
                // Desktop and other browsers use the standard flow
                try {
                    // Create OAuth session with Google provider
                    await account.createOAuth2Session(
                        'google',
                        successUrl,
                        failureUrl
                    );
                } catch (error) {
                    console.error('Google login error:', error);
                    toast.error('Failed to start authentication. Please try again.');
                    setLoading(false);
                    
                    // Clear the authentication progress flag
                    if (typeof window !== 'undefined') {
                        sessionStorage.removeItem('googleAuthInProgress');
                        sessionStorage.removeItem('googleAuthExpiryTime');
                        sessionStorage.removeItem('authBrowserInfo');
                    }
                }
            }
        } catch (error) {
            console.error('Google login error:', error);
            
            // Only show errors if user hasn't been redirected yet
            if (typeof window !== 'undefined' && !sessionStorage.getItem('googleAuthInProgress')) {
                toast.dismiss('google-redirect');
                
                if (error.code === 400) {
                    toast.error('Authentication configuration error. Please try again later or contact support.');
                } else if (error.code === 401) {
                    toast.error('Authentication error. Please try again.');
                } else if (error.code === 429) {
                    toast.error('Too many login attempts. Please wait a few minutes and try again.');
                } else {
                    toast.error('Failed to login with Google. Please try again later.');
                }
            }
            
            setLoading(false);
            
            // Clear the authentication in progress flag if there was an error
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('googleAuthInProgress');
                sessionStorage.removeItem('googleAuthExpiryTime');
                sessionStorage.removeItem('authBrowserInfo');
            }
        }
    }

    const login = async () => {
        let isError = validate();
        if (isError) return;
        if (!contextUser) return;

        try {
            setLoading(true);
            await contextUser.login(email, password);
            setLoading(false);
            setIsLoginOpen(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
            toast.error('Неверные учетные данные');
        }
    }

    const sendVerificationEmail = async () => {
        try {
            setLoading(true);
            const verifyUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/verify` : 'https://sacraltrack.space/verify';
            await account.createVerification(verifyUrl);
            setIsEmailSent(true);
            toast.success('Verification email sent. Please check your inbox.');
            
            // Close form after sending email
            setTimeout(() => {
                setIsLoginOpen(false);
            }, 2000);
        } catch (error) {
            console.error('Email verification error:', error);
            toast.error('Failed to send verification email');
        } finally {
            setLoading(false);
        }
    }

    const sendPasswordRecovery = async () => {
        if (!email) {
            setError({ type: 'email', message: 'Please enter your email address' });
            return;
        }

        try {
            setLoading(true);
            
            // Формируем URL для сброса пароля
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL 
                ? process.env.NEXT_PUBLIC_APP_URL 
                : 'http://localhost:3000';
            const resetUrl = `${baseUrl}/reset-password`;
            
            // Отправляем запрос на восстановление пароля через Appwrite
            await account.createRecovery(email, resetUrl);
            
            // Показываем уведомление об успешной отправке
            toast.success('Password reset instructions have been sent to your email', {
                duration: 5000,
                style: {
                    background: '#272B43',
                    color: '#fff',
                    borderLeft: '4px solid #20DDBB'
                }
            });
            
            // Обновляем состояние
            setResetEmailSent(true);
            setShowForgotPassword(false);
            
        } catch (error: any) {
            console.error('Password recovery error:', error);
            
            // Определяем сообщение об ошибке
            let errorMessage = 'Failed to send recovery email';
            
            if (error.code === 429) {
                errorMessage = 'Too many attempts. Please try again later.';
            } else if (error.code === 400) {
                errorMessage = 'Please enter a valid email address.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            // Показываем ошибку
            toast.error(errorMessage, {
                duration: 5000,
                style: {
                    background: '#272B43',
                    color: '#fff',
                    borderLeft: '4px solid #EF4444'
                }
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleForgotPassword = () => {
        setShowForgotPassword(!showForgotPassword);
        setError(null);
    };

    const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            setIsLoginOpen(false);
        }
    };

    const switchToRegister = () => {
        setIsRegisterOpen(true);
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
                        onClick={() => setIsLoginOpen(false)}
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
                                Welcome Back!
                            </motion.h1>
                            <motion.p 
                                className="text-[#818BAC]"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                Continue your musical journey
                            </motion.p>
                        </div>

                        <motion.div 
                            className="space-y-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            {showForgotPassword ? (
                                <>
                                    <div className="text-center mb-4">
                                        <h2 className="text-xl font-semibold text-white mb-2">Reset Password</h2>
                                        <p className="text-[#818BAC] text-sm">
                                            Enter your email address and we'll send you instructions to reset your password
                                        </p>
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
                                    
                                    <div className="flex gap-3 mt-6">
                                        <button 
                                            onClick={toggleForgotPassword}
                                            className="flex-1 py-3 px-4 border border-[#2A2B3F] text-[#818BAC] rounded-xl 
                                            hover:bg-[#2A2B3F]/50 hover:text-white transition-colors duration-300"
                                            disabled={loading}
                                        >
                                            Back to Login
                                        </button>
                                        
                                        <button 
                                            onClick={sendPasswordRecovery}
                                            className="
                                                flex-1 bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] 
                                                text-white py-3 px-4 rounded-xl font-medium
                                                relative overflow-hidden group
                                            "
                                            disabled={loading}
                                        >
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                            <div className="relative flex items-center justify-center">
                                                {loading ? (
                                                    <BiLoaderCircle className="animate-spin text-xl" />
                                                ) : (
                                                    <span>Send Reset Link</span>
                                                )}
                                            </div>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
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
                                    
                                    <div className="text-right">
                                        <button 
                                            onClick={toggleForgotPassword}
                                            className="text-[#20DDBB] hover:text-[#8A2BE2] text-sm transition-colors duration-300"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>

                        <motion.div 
                            className="mt-8 space-y-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            {!showForgotPassword && (
                                <>
                                    <button 
                                        disabled={loading}
                                        onClick={login}
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
                                                    <span>Log In</span>
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
                                            onClick={handleGoogleLogin}
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
                                </>
                            )}
                        </motion.div>

                        {!showForgotPassword && (
                            <motion.div 
                                className="mt-6 text-center space-y-3"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                            >
                                <button 
                                    onClick={sendVerificationEmail}
                                    className="text-[#20DDBB] hover:text-[#8A2BE2] transition-colors duration-300 text-sm font-medium"
                                >
                                    Need to verify your email?
                                </button>

                                <p className="text-[#818BAC] text-sm">
                                    Don't have an account?{' '}
                                    <button 
                                        onClick={switchToRegister}
                                        className="text-[#20DDBB] hover:text-[#8A2BE2] transition-colors duration-300 font-medium"
                                    >
                                        Sign up
                                    </button>
                                </p>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </motion.div>

            <AnimatePresence>
                {isEmailSent && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed bottom-8 right-8 bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] text-white p-6 rounded-2xl shadow-lg backdrop-blur-xl"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg">
                                <FiMail className="text-xl" />
                            </div>
                            <p>Check your email for verification!</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
