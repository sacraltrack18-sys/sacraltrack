'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { account } from '@/libs/AppWriteClient';
import { toast } from 'react-hot-toast';
import { BiLoaderCircle } from 'react-icons/bi';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { motion } from 'framer-motion';

export default function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [userId, setUserId] = useState<string>('');
    const [secret, setSecret] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
    const [resetCompleted, setResetCompleted] = useState<boolean>(false);
    
    useEffect(() => {
        // Проверяем, что searchParams не null
        if (!searchParams) {
            setError('Ошибка получения параметров URL');
            return;
        }
        
        // Получаем параметры из URL, которые передает Appwrite
        const userId = searchParams.get('userId');
        const secret = searchParams.get('secret');
        
        if (!userId || !secret) {
            setError('Недействительная или истекшая ссылка для сброса пароля');
            return;
        }
        
        setUserId(userId);
        setSecret(secret);
    }, [searchParams]);
    
    const validate = (): boolean => {
        setError(null);
        
        if (!password) {
            setError('Пожалуйста, введите новый пароль');
            return false;
        }
        
        if (password.length < 8) {
            setError('Пароль должен содержать не менее 8 символов');
            return false;
        }
        
        if (password !== confirmPassword) {
            setError('Пароли не совпадают');
            return false;
        }
        
        return true;
    };
    
    const handleResetPassword = async () => {
        if (!validate()) return;
        
        try {
            setLoading(true);
            
            // Используем Appwrite метод для установки нового пароля
            await account.updateRecovery(userId, secret, password, password);
            
            // Показываем уведомление об успехе
            toast.success('Пароль успешно изменен! Теперь вы можете войти с новым паролем.');
            
            // Отмечаем, что сброс выполнен успешно
            setResetCompleted(true);
            
            // Через несколько секунд перенаправляем на главную
            setTimeout(() => {
                router.push('/');
            }, 3000);
        } catch (error: any) {
            console.error('Password reset error:', error);
            
            let errorMessage = 'Не удалось сбросить пароль';
            
            if (error.code === 401) {
                errorMessage = 'Недействительная или истекшая ссылка для сброса пароля';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-[#1E1F2E] flex items-center justify-center p-4">
            <div className="relative bg-[#14151F]/80 rounded-3xl p-8 backdrop-blur-xl border-2 border-[#20DDBB]/20 w-full max-w-md">
                {resetCompleted ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center"
                    >
                        <div className="flex items-center justify-center mb-6">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] mb-4">
                            Пароль успешно изменен!
                        </h2>
                        <p className="text-[#818BAC] mb-2">
                            Теперь вы можете войти, используя новый пароль.
                        </p>
                        <p className="text-[#818BAC]">
                            Перенаправление на главную страницу...
                        </p>
                    </motion.div>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold text-white mb-6 text-center">Сброс пароля</h2>
                        
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded-lg mb-4">
                                {error}
                            </div>
                        )}
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[#818BAC] text-sm mb-2">Новый пароль</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-[#14151F]/60 text-white px-4 py-3 rounded-xl border border-[#2A2B3F] focus:border-[#20DDBB]/50 focus:outline-none"
                                        placeholder="Введите новый пароль"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#818BAC]"
                                    >
                                        {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-[#818BAC] text-sm mb-2">Подтвердите новый пароль</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-[#14151F]/60 text-white px-4 py-3 rounded-xl border border-[#2A2B3F] focus:border-[#20DDBB]/50 focus:outline-none"
                                        placeholder="Подтвердите новый пароль"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#818BAC]"
                                    >
                                        {showConfirmPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                                    </button>
                                </div>
                            </div>
                            
                            <button
                                onClick={handleResetPassword}
                                disabled={loading}
                                className="
                                    w-full bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] 
                                    text-white py-3 px-4 rounded-xl font-medium mt-4
                                    relative overflow-hidden group
                                "
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                <div className="relative flex items-center justify-center">
                                    {loading ? (
                                        <BiLoaderCircle className="animate-spin text-xl" />
                                    ) : (
                                        <span>Сбросить пароль</span>
                                    )}
                                </div>
                            </button>
                            
                            <p className="text-center text-[#818BAC] text-sm">
                                Вспомнили пароль? <a href="/" className="text-[#20DDBB] hover:underline">Вернуться на главную</a>
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
} 