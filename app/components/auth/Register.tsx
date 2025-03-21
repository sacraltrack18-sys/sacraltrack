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
        try {
            setLoading(true);
            
            // Проверяем наличие необходимых переменных окружения
            if (!process.env.NEXT_PUBLIC_APP_URL) {
                throw new Error('APP_URL configuration is missing');
            }
            
            if (!process.env.NEXT_PUBLIC_APPWRITE_URL) {
                throw new Error('APPWRITE_URL configuration is missing');
            }

            // Закрываем форму регистрации перед редиректом
            setIsRegisterOpen(false);

            // Формируем URL для перенаправления
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, '');
            const successUrl = `${baseUrl}/success`;
            const failureUrl = `${baseUrl}/fail`;

            // Проверяем текущую сессию
            try {
                const session = await account.getSession('current');
                if (session) {
                    await account.deleteSession('current');
                }
            } catch (error) {
                // Если сессии нет, это нормально
                console.log('No existing session found');
            }

            // Создаем OAuth сессию
            await account.createOAuth2Session(
                'google',
                successUrl,
                failureUrl
            );
        } catch (error: any) {
            console.error('Google registration error:', error);
            
            if (error.code === 400) {
                toast.error('Ошибка конфигурации. Пожалуйста, проверьте настройки приложения.');
            } else if (error.code === 401) {
                toast.error('Ошибка аутентификации. Попробуйте еще раз.');
            } else if (error.code === 429) {
                toast.error('Слишком много попыток. Подождите несколько минут.');
            } else {
                toast.error('Не удалось выполнить вход через Google. Попробуйте позже.');
            }
            
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
        const requiredDelay = 5000; // 5 seconds delay between attempts

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
            
            await contextUser.register(name, email, password);
            setRegistrationSuccess(true);
            
            await account.createVerification('http://localhost:3000/verify');
            toast.success('Please check your email to verify your account');
            
            // Закрываем форму регистрации сразу после успешной регистрации
            setIsRegisterOpen(false);
        } catch (error: any) {
            console.error('Registration error:', error);
            setLoading(false);
            
            // Handle rate limit error specifically
            if (error.message.includes('rate limit') || error.message.includes('too many attempts')) {
                toast.error('Too many registration attempts. Please try again in a few minutes.', {
                    duration: 5000,
                    style: {
                        background: '#272B43',
                        color: '#fff',
                        borderLeft: '4px solid #EF4444'
                    }
                });
                return;
            }

            // Handle session exists error
            if (error.message.includes('log out before creating')) {
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
                            className="px-4 py-2 bg-[#20DDBB] rounded-lg text-white hover:bg-[#1CB99A] transition-colors"
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
                                            scale: [1, 1.2, 1],
                                            opacity: [0.5, 0.8, 0.5]
                                        }}
                                        transition={{ 
                                            duration: 2,
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
                                                    duration: 8,
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
