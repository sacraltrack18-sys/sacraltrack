import TextInput from "../TextInput";
import { useState, useEffect } from "react";
import { ShowErrorObject } from "@/app/types";
import { useUser } from "@/app/context/user";
import { useGeneralStore } from "@/app/stores/general";
import { BiLoaderCircle } from "react-icons/bi";
import { FcGoogle } from "react-icons/fc";
import { FiMail, FiLock, FiX } from "react-icons/fi";
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
        try {
            setLoading(true);
            await account.createOAuth2Session(
                'google',
                'http://localhost:3000/success',
                'http://localhost:3000/fail'
            );
        } catch (error) {
            console.error('Google login error:', error);
            toast.error('Failed to login with Google');
            setLoading(false);
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
            toast.success('Welcome back to Sacral Track! 🎵');
        } catch (error) {
            console.error(error);
            setLoading(false);
            toast.error('Invalid credentials');
        }
    }

    const sendVerificationEmail = async () => {
        try {
            setLoading(true);
            await account.createVerification('http://localhost:3000/verify');
            setIsEmailSent(true);
            toast.success('Verification email sent! Please check your inbox.');
        } catch (error) {
            console.error('Email verification error:', error);
            toast.error('Failed to send verification email');
        } finally {
            setLoading(false);
        }
    }

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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
                                        <img 
                                            src="/logo.png" 
                                            alt="Sacral Track"
                                            className="w-full h-full object-cover"
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
                                        outline-none
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
                                    inputType="password"
                                    error={showError('password')}
                                    className={`
                                        w-full bg-[#14151F]/60 border-2 
                                        ${error?.type === 'password' ? 'border-red-500' : 'border-[#2A2B3F]'} 
                                        rounded-xl p-4 pl-12 text-white placeholder-[#818BAC]/50
                                        focus:border-[#20DDBB] focus:bg-[#14151F]/80
                                        transition-all duration-300
                                        group-hover:border-[#20DDBB]/50
                                        outline-none
                                    `}
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <FiLock className="text-[#818BAC] group-hover:text-[#20DDBB] transition-colors duration-300" />
                                </div>
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
                                            <span>Log in</span>
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
                        </motion.div>

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
                            <p>Check your email for verification link!</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
