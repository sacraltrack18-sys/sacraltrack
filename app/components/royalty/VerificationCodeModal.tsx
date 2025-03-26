import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCheckCircle, FaExclamationCircle, FaPaperPlane, FaFireAlt, FaPhone, FaArrowRight } from 'react-icons/fa';
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
  
  const phoneInputRef = useRef<HTMLInputElement>(null);
  
  // Валидация номера телефона
  const validatePhoneNumber = (phone: string) => {
    if (!phone.trim()) {
      return 'Phone number is required';
    }
    
    // Проверка на минимальную длину (7 цифр) и максимальную (15 цифр)
    if (phone.length < 7 || phone.length > 15) {
      return 'Enter a valid phone number (7-15 digits)';
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
      return;
    }
    
    if (!onPhoneSubmit) {
      toast.error('Phone verification is not configured');
      return;
    }
    
    try {
      setIsPhoneSubmitting(true);
      // Преобразуем строку в число и отправляем
      const phoneNumber = parseInt(phoneInput.replace(/\D/g, ''), 10);
      const success = await onPhoneSubmit(phoneNumber);
      
      if (success) {
        setShowCodeInputs(true);
        // Если есть callback для обновления телефона в родительском компоненте
        if (onPhoneChange) {
          onPhoneChange(phoneInput);
        }
        
        // Фокус на первое поле для ввода кода
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      }
    } catch (error) {
      console.error('Error submitting phone number:', error);
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
      
      if (type === 'phone') {
        // Close current modal to allow resending via Firebase
        // (Firebase needs to recreate the reCAPTCHA)
        onClose();
        toast.success('Please try sending the code again');
        return;
      }
      
      // For email, we can just simulate resending
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated API call
      setTimeLeft(60);
      setCanResend(false);
      toast.success('Verification code resent!');
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
            <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
            <span>Verifying code...</span>
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

  // Render phone input form
  const renderPhoneInputForm = () => {
    if (type !== 'phone' || showCodeInputs) return null;
    
    return (
      <form onSubmit={handlePhoneSubmit} className="space-y-4 mb-4">
        <div className="space-y-2">
          <label className="text-white text-sm font-medium flex items-center gap-2">
            <FaPhone className="text-violet-300" />
            <span>Your Phone Number</span>
          </label>
          <div className="relative">
            <input
              type="tel"
              ref={phoneInputRef}
              value={phoneInput}
              onChange={(e) => {
                setPhoneInput(e.target.value.replace(/[^0-9+]/g, ''));
                if (phoneInputError) setPhoneInputError('');
              }}
              placeholder="+1234567890"
              className={`w-full px-4 py-3 text-sm rounded-lg bg-[#1A2338]/80 border ${
                phoneInputError 
                  ? 'border-red-500/70 focus:ring-red-500'
                  : 'border-[#3f2d63]/70 focus:ring-purple-500'
              } text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:border-transparent`}
            />
            {phoneInputError && (
              <p className="text-red-400 text-xs mt-1">{phoneInputError}</p>
            )}
          </div>
          <p className="text-[#9BA3BF] text-xs">
            Enter your phone number with country code (e.g. +1 for US, +7 for Russia). 
            <span className="text-violet-300">Include the + symbol and all digits, no spaces.</span>
          </p>
        </div>
        
        <button
          type="submit"
          disabled={isPhoneSubmitting || !phoneInput}
          className={`w-full py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
            isPhoneSubmitting || !phoneInput
              ? 'bg-[#1A2338]/80 text-[#818BAC] cursor-not-allowed'
              : 'bg-gradient-to-r from-[#3f2d63] to-[#4e377a] text-white hover:shadow-lg hover:shadow-violet-900/20'
          }`}
        >
          {isPhoneSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Send Verification Code</span>
              <FaArrowRight size={12} />
            </>
          )}
        </button>
      </form>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-gradient-to-br from-[#1A2338] to-[#252742] rounded-2xl p-6 max-w-md w-full shadow-xl border border-purple-500/20"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
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

            {/* Conditional Message - только если показываем поля ввода кода */}
            {showCodeInputs && (
              <div className="mb-6">
                <p className="text-[#9BA3BF] text-sm mb-2">
                  Enter the verification code sent to:
                </p>
                <p className="text-white font-medium">
                  {type === 'email' ? email : phoneInput}
                </p>
                <p className="text-xs text-[#9BA3BF] mt-2">
                  {type === 'email' 
                    ? 'Check your spam folder if you don\'t receive the code within a few minutes'
                    : 'Firebase verification: Enter the 6-digit code from the SMS'
                  }
                </p>
              </div>
            )}

            {renderVerificationStatus()}
            
            {/* Phone Input Form */}
            {renderPhoneInputForm()}

            {/* Code Input Form - показываем только если уже есть номер телефона */}
            {showCodeInputs && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex justify-center gap-2">
                  {[...Array(6)].map((_, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        transition: { delay: index * 0.05 }
                      }}
                      className="relative"
                    >
                      <input
                        ref={el => inputRefs.current[index] = el}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={code[index] || ''}
                        onChange={(e) => handleCodeChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg font-bold border border-purple-500/30 bg-[#1A2338]/80 rounded-lg text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </motion.div>
                  ))}
                </div>
                
                <div className="text-center text-xs text-[#9BA3BF]">
                  {!canResend ? (
                    <p>Resend code in {timeLeft} seconds</p>
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
                
                <button
                  type="submit"
                  disabled={code.length !== 6 || isSubmitting}
                  className={`w-full py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                    code.length !== 6 || isSubmitting
                      ? 'bg-[#1A2338]/80 text-[#818BAC] cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#3f2d63] to-[#4e377a] text-white hover:shadow-lg hover:shadow-violet-900/20'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Verify Code'
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 