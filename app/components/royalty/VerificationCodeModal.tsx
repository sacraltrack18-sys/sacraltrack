import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCheckCircle, FaExclamationCircle, FaPaperPlane, FaFireAlt } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface VerificationCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<void>;
  type: 'email' | 'phone';
  email?: string;
  phone?: number | string;
}

export default function VerificationCodeModal({
  isOpen,
  onClose,
  onVerify,
  type,
  email,
  phone
}: VerificationCodeModalProps) {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
      // Focus the first input when modal opens
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

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

            <div className="mb-6">
              <p className="text-[#9BA3BF] text-sm mb-2">
                Enter the verification code sent to:
              </p>
              <p className="text-white font-medium">
                {type === 'email' ? email : phone?.toString()}
              </p>
              <p className="text-xs text-[#9BA3BF] mt-2">
                {type === 'email' 
                  ? 'Check your spam folder if you don\'t receive the code within a few minutes'
                  : 'Firebase verification: Enter the 6-digit code from the SMS'
                }
              </p>
            </div>

            {renderVerificationStatus()}

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
                      maxLength={1}
                      className="w-12 h-14 text-center text-white text-lg font-bold bg-[#1A2338]/80 border border-[#3f2d63]/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={code[index] || ''}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      disabled={isSubmitting || verificationStatus === 'success'}
                    />
                    {/* Subtle gradient bottom border */}
                    <div className={`absolute bottom-0 left-0 w-full h-1 rounded-b-lg ${code[index] ? 'bg-gradient-to-r from-purple-400 to-blue-500' : 'bg-transparent'}`}></div>
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-between items-center text-sm mt-6">
                <motion.button
                  type="button"
                  onClick={handleResendCode}
                  disabled={!canResend || isSubmitting || verificationStatus === 'success'}
                  whileHover={canResend && !isSubmitting && verificationStatus !== 'success' ? { scale: 1.05 } : {}}
                  whileTap={canResend && !isSubmitting && verificationStatus !== 'success' ? { scale: 0.95 } : {}}
                  className={`flex items-center gap-1.5 text-purple-400 hover:text-purple-300 transition-colors ${
                    (!canResend || isSubmitting || verificationStatus === 'success') ? 'opacity-50 cursor-not-allowed' : 'hover:underline'
                  }`}
                >
                  <FaPaperPlane size={12} />
                  <span>{canResend ? 'Resend Code' : `Resend in ${timeLeft}s`}</span>
                </motion.button>
                
                <motion.button
                  type="submit"
                  disabled={code.length !== 6 || isSubmitting || verificationStatus === 'success'}
                  whileHover={code.length === 6 && !isSubmitting && verificationStatus !== 'success' ? { scale: 1.05, y: -2 } : {}}
                  whileTap={code.length === 6 && !isSubmitting && verificationStatus !== 'success' ? { scale: 0.95 } : {}}
                  className={`relative overflow-hidden bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
                    (code.length !== 6 || isSubmitting || verificationStatus === 'success') ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-purple-500/20'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : verificationStatus === 'success' ? (
                    <>
                      <span>Verified</span>
                      <FaCheckCircle />
                    </>
                  ) : (
                    <>
                      <span>Verify</span>
                      <FaCheckCircle />
                      {/* Button glow effect */}
                      {code.length === 6 && !isSubmitting && (
                        <motion.div 
                          className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-purple-500/0 via-white/20 to-purple-500/0"
                          initial={{ x: '-100%' }}
                          animate={{ x: '100%' }}
                          transition={{ 
                            repeat: Infinity, 
                            duration: 1.5, 
                            ease: 'linear',
                            repeatDelay: 0.5
                          }}
                        />
                      )}
                    </>
                  )}
                </motion.button>
              </div>
            </form>

            <div className="mt-6 flex items-center gap-2 text-sm text-[#9BA3BF] bg-[#1A2338]/40 p-3 rounded-lg">
              {type === 'phone' ? (
                <div className="flex items-start gap-2">
                  <FaFireAlt className="text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="mb-1">This code is sent via Firebase Authentication.</p>
                    <p className="text-xs opacity-80">
                      Standard SMS rates may apply. Your privacy is protected by Firebase.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <FaExclamationCircle className="text-amber-400 flex-shrink-0" />
                  <p>
                    Didn't receive the code? Check your spam folder or try resending.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 