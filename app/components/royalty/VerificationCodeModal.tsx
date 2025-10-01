import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaTimes, 
  FaCheckCircle, 
  FaExclamationCircle, 
  FaPaperPlane, 
  FaFireAlt, 
  FaPhone, 
  FaArrowRight, 
  FaSms,
  FaMobileAlt,
  FaShieldAlt
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface VerificationCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<void>;
  type: 'email' | 'phone';
  email?: string;
  phone?: number | string;
  onPhoneChange?: (phoneNumber: string) => void;
  onPhoneSubmit?: (phoneNumber: number) => Promise<boolean>;
}

export default function VerificationCodeModal({
  isOpen,
  onClose,
  onVerify,
  type,
  email,
  phone,
  onPhoneChange,
  onPhoneSubmit
}: VerificationCodeModalProps) {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Добавляем состояние для ввода телефона
  const [phoneInput, setPhoneInput] = useState(phone?.toString() || '');
  const [phoneInputError, setPhoneInputError] = useState('');
  const [isPhoneSubmitting, setIsPhoneSubmitting] = useState(false);
  const [showCodeInputs, setShowCodeInputs] = useState(!!phone);
  
  // Добавляем состояние для анимированного перехода между шагами
  const [phoneStep, setPhoneStep] = useState<'input' | 'code'>(!phone ? 'input' : 'code');
  
  const phoneInputRef = useRef<HTMLInputElement>(null);
  
  // Улучшенная валидация номера телефона
  const validatePhoneNumber = (phone: string) => {
    if (!phone.trim()) {
      return 'Phone number is required';
    }
    
    // Проверяем наличие кода страны (начинается с +)
    if (!phone.startsWith('+')) {
      return 'Phone number must include country code (e.g. +1)';
    }
    
    // Проверка на минимальную длину (должен быть не менее 8 символов - "+" плюс минимум 7 цифр)
    if (phone.length < 8) {
      return 'Phone number is too short';
    }
    
    // Проверка на содержание только цифр после знака +
    const digitPart = phone.substring(1);
    if (!/^\d+$/.test(digitPart)) {
      return 'Phone number should contain only digits after +';
    }
    
    return '';
  };

  // Initialize refs
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, 6);
  }, []);

  // Reset values when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCode('');
      setTimeLeft(60);
      setCanResend(false);
      setVerificationStatus('idle');
      setPhoneInput(phone?.toString() || '');
      setShowCodeInputs(!!phone);
      setPhoneStep(!phone ? 'input' : 'code');
      
      // Focus appropriate input when modal opens
      setTimeout(() => {
        if (type === 'phone' && !phone && phoneInputRef.current) {
          phoneInputRef.current.focus();
        } else if (showCodeInputs) {
          inputRefs.current[0]?.focus();
        }
      }, 100);
    }
  }, [isOpen, phone, type, showCodeInputs]);

  // Обновляем phone input при изменении пропса phone
  useEffect(() => {
    if (phone) {
      setPhoneInput(phone.toString());
      setShowCodeInputs(true);
      setPhoneStep('code');
    }
  }, [phone]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0 && !canResend) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [timeLeft, canResend]);

  // Обработчик отправки номера телефона
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const error = validatePhoneNumber(phoneInput);
    if (error) {
      setPhoneInputError(error);
      toast.error(error);
      return;
    }
    
    if (!onPhoneSubmit) {
      toast.error('Phone verification is not configured');
      return;
    }
    
    try {
      console.log('🚀 Начинаем отправку кода верификации на номер:', phoneInput);
      setIsPhoneSubmitting(true);
      
      // Преобразуем строку в число и отправляем
      const phoneNumber = parseInt(phoneInput.replace(/\D/g, ''), 10);
      console.log('🔄 Отправляем запрос с номером:', phoneNumber);
      
      const success = await onPhoneSubmit(phoneNumber);
      console.log('✅ Результат отправки кода:', success);
      
      if (success) {
        // Явное уведомление о том, что теперь нужно ввести код
        toast.success('Verification code sent! Please enter the 6-digit code below', { duration: 5000 });
        
        // ВАЖНО: Используем функциональное обновление состояния для гарантии актуальных значений
        setPhoneStep((prev) => {
          console.log('🔄 Изменяем phoneStep с', prev, 'на code');
          return 'code';
        });
        
        setShowCodeInputs((prev) => {
          console.log('🔄 Изменяем showCodeInputs с', prev, 'на true');
          return true;
        });
        
        // Если есть callback для обновления телефона в родительском компоненте
        if (onPhoneChange) {
          onPhoneChange(phoneInput);
        }
        
        // Сбрасываем таймер для повторной отправки
        setTimeLeft(60);
        setCanResend(false);
        
        // Добавляем задержку перед проверкой состояния
        setTimeout(() => {
          console.log('🔍 Проверка состояния после таймаута:', {
            phoneStep,
            showCodeInputs,
            isOpen,
            phoneInput
          });
          
          // Фокус на первое поле для ввода кода
          inputRefs.current[0]?.focus();
          
          // Если form не изменилась - принудительно показываем сообщение об ошибке
          if (phoneStep !== 'code' || !showCodeInputs) {
            console.error('❌ ОШИБКА: Не произошло переключение на форму ввода кода!');
            toast.error('An error occurred while switching to code input form. Please try again.', {
              duration: 5000,
              id: 'code-switch-error'
            });
          }
        }, 500);
      } else {
        toast.error('Failed to send verification code');
        console.error('❌ Сервер вернул неуспешный статус при отправке кода');
      }
    } catch (error) {
      console.error('❌ Ошибка при отправке номера телефона:', error);
      toast.error('An error occurred while sending verification code');
    } finally {
      setIsPhoneSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    try {
      setIsSubmitting(true);
      setVerificationStatus('verifying');
      await onVerify(code);
      setVerificationStatus('success');
      
      // Show success animation before closing
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationStatus('error');
      toast.error('Invalid verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;
    
    try {
      setIsSubmitting(true);
      
      if (type === 'phone' && onPhoneSubmit) {
        // Для телефона используем тот же механизм отправки кода
        const phoneNumber = parseInt(phoneInput.replace(/\D/g, ''), 10);
        const success = await onPhoneSubmit(phoneNumber);
        
        if (success) {
          setTimeLeft(60);
          setCanResend(false);
          toast.success('Verification code resent!');
        } else {
          toast.error('Failed to resend code');
        }
      } else {
        // Для email сохраняем старую логику
        await new Promise(resolve => setTimeout(resolve, 1000));
        setTimeLeft(60);
        setCanResend(false);
        toast.success('Verification code resent!');
      }
    } catch (error) {
      toast.error('Failed to resend code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input for each digit
  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(0, 1);
    }

    const newCode = code.split('');
    newCode[index] = value.replace(/\D/g, '');
    setCode(newCode.join(''));
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // Handle paste events
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then((pastedText) => {
        const digits = pastedText.replace(/\D/g, '').slice(0, 6);
        if (digits) {
          setCode(digits.padEnd(6, '').slice(0, 6));
          if (digits.length === 6) {
            // Focus the last input if we have a complete code
            inputRefs.current[5]?.focus();
          } else if (digits.length > 0) {
            // Focus the next empty input
            inputRefs.current[digits.length]?.focus();
          }
        }
      });
    }
  };

  // Render verification status indicator
  const renderVerificationStatus = () => {
    if (verificationStatus === 'idle') return null;
    
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`my-4 p-3 rounded-lg flex items-center gap-2 ${
          verificationStatus === 'verifying' ? 'bg-blue-500/10 text-blue-300' :
          verificationStatus === 'success' ? 'bg-green-500/10 text-green-300' :
          'bg-red-500/10 text-red-300'
        }`}
      >
        {verificationStatus === 'verifying' && (
          <>
            <div className="w-5 h-5 border-2 border-t-transparent border-blue-300 rounded-full animate-spin"></div>
            <span>Verifying your code...</span>
          </>
        )}
        
        {verificationStatus === 'success' && (
          <>
            <FaCheckCircle className="text-green-300" />
            <span>Verification successful!</span>
          </>
        )}
        
        {verificationStatus === 'error' && (
          <>
            <FaExclamationCircle className="text-red-300" />
            <span>Invalid code. Please try again.</span>
          </>
        )}
      </motion.div>
    );
  };

  // Шаги верификации (визуальный индикатор прогресса)
  const renderVerificationSteps = () => (
    <div className="flex items-center justify-center mb-6">
      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
        phoneStep === 'input' 
          ? 'bg-purple-500 text-white' 
          : 'bg-green-500 text-white'
      }`}>
        {phoneStep === 'input' ? <FaPhone size={14} /> : <FaCheckCircle size={14} />}
      </div>
      
      <div className={`h-0.5 w-12 ${
        phoneStep === 'input' ? 'bg-gray-700' : 'bg-green-500'
      }`}></div>
      
      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
        phoneStep === 'code' && showCodeInputs
          ? 'bg-purple-500 text-white' 
          : 'bg-gray-700 text-gray-400'
      }`}>
        <FaSms size={14} />
      </div>
      
      <div className="h-0.5 w-12 bg-gray-700"></div>
      
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 text-gray-400">
        <FaShieldAlt size={14} />
      </div>
    </div>
  );

  // Submit button with improved design
  const renderSubmitButton = () => (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      type="submit"
      disabled={isSubmitting || code.length !== 6}
      className={`
        w-full mt-4 py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-white font-medium
        ${isSubmitting || code.length !== 6
          ? 'bg-gray-600/30 cursor-not-allowed'
          : 'bg-gradient-to-r from-purple-500 to-violet-600 hover:shadow-lg hover:shadow-purple-500/20'
        }
        transition-all duration-300
      `}
    >
      {isSubmitting ? (
        <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
      ) : (
        <>
          <FaCheckCircle size={18} />
          <span>Verify Code</span>
        </>
      )}
    </motion.button>
  );

  // Render phone input form
  const renderPhoneInputForm = () => {
    if (type !== 'phone' || phoneStep !== 'input') return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
      >
        <form onSubmit={handlePhoneSubmit} className="space-y-4 mb-4">
          <div className="space-y-2">
            <label className="text-white text-sm font-medium flex items-center gap-2">
              <FaPhone className="text-violet-300" />
              <span>Your Phone Number</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaMobileAlt className="text-violet-400" />
              </div>
              <input
                type="tel"
                ref={phoneInputRef}
                value={phoneInput}
                onChange={(e) => {
                  setPhoneInput(e.target.value.replace(/[^0-9+]/g, ''));
                  if (phoneInputError) setPhoneInputError('');
                }}
                placeholder="+1234567890"
                className={`w-full pl-10 pr-4 py-3 text-sm rounded-lg bg-[#1A2338]/80 border ${
                  phoneInputError 
                    ? 'border-red-500/70 focus:ring-red-500'
                    : 'border-[#3f2d63]/70 focus:ring-violet-500'
                } text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:border-transparent`}
              />
              {phoneInputError && (
                <p className="text-red-400 text-xs mt-1">{phoneInputError}</p>
              )}
            </div>
            <div className="bg-violet-900/20 p-3 rounded-lg border border-violet-500/20">
              <p className="text-violet-300 text-xs font-medium mb-1">Important Instructions:</p>
              <ul className="text-[#9BA3BF] text-xs space-y-1">
                <li className="flex items-start gap-1.5">
                  <span className="text-violet-400 mt-0.5">•</span>
                  <span>Include country code with + symbol (e.g. +1 for US, +7 for Russia)</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-violet-400 mt-0.5">•</span>
                  <span>Enter all digits without spaces or dashes</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-violet-400 mt-0.5">•</span>
                  <span>Make sure your phone can receive SMS messages</span>
                </li>
              </ul>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isPhoneSubmitting || !phoneInput}
            className={`
              w-full mt-4 py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-white font-medium
              ${isPhoneSubmitting || !phoneInput
                ? 'bg-gray-600/30 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-violet-600 hover:shadow-lg hover:shadow-purple-500/20'
              }
              transition-all duration-300
            `}
          >
            {isPhoneSubmitting ? (
              <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
            ) : (
              <>
                <FaPaperPlane size={16} />
                <span>Send Verification Code</span>
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    );
  };

  // Render code input form with improved UI
  const renderCodeInputForm = () => {
    // Отладочная информация для диагностики проблемы
    console.log('🔍 renderCodeInputForm вызван:', {
      showCodeInputs,
      phoneStep,
      phoneInput,
      isOpen
    });

    // Упрощаем проверку - достаточно одного условия
    if (phoneStep !== 'code') {
      console.log('❌ Форма кода не отображается: phoneStep =', phoneStep);
      return null;
    }
    
    console.log('✅ Форма кода будет отображена');
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30,
          duration: 0.5 
        }}
        className="relative"
      >
        {/* Эффект "Новое" сверху */}
        <div className="absolute -top-5 left-0 right-0 flex justify-center">
          <div className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-bounce">
            New Step
          </div>
        </div>
        
        <div className="mb-6 mt-2">
          {/* Блок с информацией об отправке кода */}
          <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/20 mb-6 relative overflow-hidden">
            {/* Пульсирующий фон для привлечения внимания */}
            <div className="absolute inset-0 bg-purple-500/5 animate-pulse"></div>
            
            {/* Диагональная лента "Код отправлен" */}
            <div className="absolute -right-10 top-4 bg-green-500/80 text-white text-xs font-bold py-1 px-10 transform rotate-45 shadow-md">
              SMS SENT
            </div>
            
            {/* Стрелка, указывающая на поля ввода */}
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-purple-400 animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M19 12l-7 7-7-7"/>
              </svg>
            </div>
            
            <div className="flex items-start gap-3 relative z-10">
              <div className="bg-purple-500/20 p-2 rounded-lg">
                <FaSms className="text-purple-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium mb-1">Verification code sent to:</p>
                <p className="text-purple-300 font-medium">{phoneInput}</p>
                <p className="text-xs text-[#9BA3BF] mt-2">
                  Enter the 6-digit code from the SMS. Don't share this code with anyone.
                </p>
              </div>
            </div>
          </div>
          
          {/* Заголовок для секции ввода кода */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-1 px-3 mb-2 bg-purple-500/20 rounded-full text-purple-300 text-sm">
              <FaShieldAlt className="mr-1" size={12} />
              <span>Step 2: Verification</span>
            </div>
            <h4 className="text-xl font-bold text-white mb-1">Enter Verification Code</h4>
            <p className="text-sm text-[#9BA3BF]">Type the 6-digit code we sent via SMS</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Поля ввода кода с более заметным оформлением */}
            <div className="flex justify-center gap-2 sm:gap-3">
              {[...Array(6)].map((_, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    scale: 1,
                    transition: { 
                      delay: 0.3 + index * 0.06,
                      type: "spring",
                      stiffness: 400
                    }
                  }}
                  className="relative"
                >
                  <input
                    ref={(el: HTMLInputElement | null): void => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={code[index] || ''}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold border-2 border-purple-500/50 bg-[#1A2338]/80 rounded-lg text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-lg shadow-purple-500/10"
                  />
                  {/* Мигающий курсор для первого пустого поля */}
                  {code.length === index && !code[index] && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-0.5 h-6 bg-purple-400 animate-blink"></div>
                    </div>
                  )}
                  
                  {/* Номер поля под инпутом */}
                  <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-[10px] text-purple-400/70">
                    {index + 1}
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Подсказка про SMS */}
            <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-500/20 mt-6">
              <div className="flex items-start gap-2">
                <div className="text-blue-400 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </div>
                <p className="text-xs text-[#9BA3BF]">
                  <span className="text-blue-300 font-medium">Did not receive the code?</span> Check that your phone number is correct and make sure your phone can receive SMS messages.
                </p>
              </div>
            </div>
            
            <div className="text-center text-xs text-[#9BA3BF] mt-2">
              {!canResend ? (
                <p>Resend code in <span className="text-purple-300 font-medium">{timeLeft}</span> seconds</p>
              ) : (
                <button 
                  type="button"
                  onClick={handleResendCode}
                  className="text-violet-300 hover:text-violet-200 hover:underline flex items-center gap-1.5 mx-auto transition-colors"
                >
                  <FaPaperPlane size={10} />
                  <span>Resend verification code</span>
                </button>
              )}
            </div>
            
            {/* Опция вернуться к редактированию номера телефона */}
            <div className="text-center">
              <button 
                type="button"
                onClick={() => {
                  setPhoneStep('input');
                  setShowCodeInputs(false);
                }}
                className="text-[#9BA3BF] hover:text-white text-xs underline transition-colors"
              >
                Edit phone number
              </button>
            </div>
            
            {/* Улучшенный вид кнопки подтверждения */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting || code.length !== 6}
              className={`
                w-full mt-4 py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 text-white font-medium
                ${isSubmitting || code.length !== 6
                  ? 'bg-gray-600/30 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-violet-600 hover:shadow-lg hover:shadow-purple-500/20'
                }
                transition-all duration-300
              `}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <FaCheckCircle size={18} />
                  <span>Verify Code</span>
                </>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-gradient-to-br from-[#1A2338] to-[#252742] rounded-2xl p-6 max-w-md w-full shadow-xl border border-purple-500/20"
            onClick={e => e.stopPropagation()}
          >
            <style jsx global>{`
              @keyframes blink {
                0%, 100% { opacity: 0; }
                50% { opacity: 1; }
              }
              .animate-blink {
                animation: blink 1s infinite;
              }
            `}</style>
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {type === 'email' ? 'Email Verification' : 'Phone Verification'}
                {type === 'phone' && <FaFireAlt className="text-orange-400 text-sm animate-pulse" />}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* Добавляем индикатор шагов (только для телефона) */}
            {type === 'phone' && renderVerificationSteps()}

            {renderVerificationStatus()}
            
            {/* Phone Input Form */}
            <AnimatePresence mode="wait">
              {renderPhoneInputForm()}
            </AnimatePresence>

            {/* Code Input Form */}
            <AnimatePresence mode="wait">
              {renderCodeInputForm()}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 