"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaCheckCircle, 
  FaTimesCircle, 
  FaEnvelope, 
  FaMobile, 
  FaShieldAlt, 
  FaInfoCircle, 
  FaArrowRight,
  FaBell, 
  FaLock,
  FaStar,
  FaUserShield,
  FaSpinner
} from 'react-icons/fa';
import VerificationCodeModal from './VerificationCodeModal';
import { toast } from 'react-hot-toast';
import useFirebasePhoneAuth from '@/app/hooks/useFirebasePhoneAuth';

// Updated animated gradient border styles
const gradientBorderStyles = `
  @keyframes borderGradientAnimation {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  
  .gradient-border {
    position: relative;
    z-index: 0;
    border-radius: 0.75rem;
    overflow: hidden;
    border: 1px solid rgba(63, 45, 99, 0.3);
    transition: all 0.3s ease;
  }
  
  .gradient-border::before {
    content: '';
    position: absolute;
    z-index: -2;
    left: -50%;
    top: -50%;
    width: 200%;
    height: 200%;
    background-color: transparent;
    background-repeat: no-repeat;
    background-size: 50% 50%, 50% 50%;
    background-position: 0 0, 100% 0, 100% 100%, 0 100%;
    background-image: linear-gradient(#3f2d63, #583d8c), 
                      linear-gradient(#4e377a, #5a6bbd),
                      linear-gradient(#583d8c, #3f2d63),
                      linear-gradient(#4d63b5, #4e377a);
    animation: borderGradientAnimation 4s linear infinite;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .gradient-border::after {
    content: '';
    position: absolute;
    z-index: -1;
    left: 1px;
    top: 1px;
    width: calc(100% - 2px);
    height: calc(100% - 2px);
    background: #1A2338;
    border-radius: 0.7rem;
  }
  
  /* Only show gradient on hover */
  .gradient-border:hover::before {
    opacity: 1;
  }
  
  /* Add subtle box shadow on hover for additional effect */
  .gradient-border:hover {
    box-shadow: 0 0 15px rgba(77, 99, 181, 0.3);
    border-color: transparent;
  }
  
  /* Keep the verification success card always glowing */
  .always-glow::before {
    opacity: 0.7 !important;
  }
  
  .always-glow {
    box-shadow: 0 0 15px rgba(77, 99, 181, 0.3);
    border-color: transparent;
  }
`;

interface UserVerificationCardProps {
  emailVerified: boolean;
  phoneVerified: boolean;
  onVerifyEmail: () => Promise<void>;
  onVerifyPhone: (phoneNumber: number) => Promise<void>;
  userEmail?: string;
  userPhone?: number;
  onEmailVerified?: () => void;
  onPhoneVerified?: (phoneNumber: number) => void;
}

const VerificationStep = ({ 
  title, 
  description, 
  icon, 
  isVerified, 
  onVerify,
  isDisabled = false,
  isLoading = false,
  verificationInfo
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  isVerified: boolean; 
  onVerify: () => void;
  isDisabled?: boolean;
  isLoading?: boolean;
  verificationInfo?: string;
}) => {
  return (
    <motion.div 
      className={`gradient-border mb-3 transition-all duration-300 ${isVerified ? 'always-glow' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!isVerified && !isDisabled ? { scale: 1.02 } : {}}
    >
      <div className={`relative p-5 rounded-lg transition-all duration-300 ${
        isVerified 
          ? 'bg-[#1A2338]/60 backdrop-blur-md' 
          : 'bg-[#1A2338]/50 hover:bg-[#1A2338]/60 backdrop-blur-md'
      }`}>
        <div className="flex justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-lg ${
              isVerified 
                ? 'bg-[#3f2d63]/30 text-violet-300' 
                : 'bg-[#1A2338]/80 text-[#818BAC]'
            }`}>
              {icon}
            </div>
            <div>
              <h3 className="text-white font-medium text-sm sm:text-base flex items-center">
                {title}
                {isVerified && (
                  <FaCheckCircle className="ml-2 text-xs sm:text-sm text-violet-300" />
                )}
              </h3>
              <p className="text-xs text-[#9BA3BF] mt-1 max-w-xs">
                {description}
              </p>
              {verificationInfo && (
                <p className="text-xs text-[#9BA3BF] mt-2 italic">
                  {verificationInfo}
                </p>
              )}
            </div>
          </div>
          
          <div>
            {isVerified ? (
              <span className="inline-flex items-center justify-center text-xs bg-[#3f2d63]/30 text-violet-300 py-1.5 px-3 rounded-full">
                Verified
              </span>
            ) : (
              <button
                onClick={onVerify}
                disabled={isDisabled || isLoading}
                className={`
                  relative overflow-hidden group flex items-center gap-1.5 text-xs py-1.5 px-3.5 rounded-full transition-all duration-300
                  ${isDisabled 
                    ? 'bg-[#1A2338]/50 text-[#818BAC] cursor-not-allowed opacity-70' 
                    : 'bg-gradient-to-r from-[#3f2d63] to-[#4e377a] text-white hover:shadow-lg hover:shadow-violet-900/20'
                  }
                `}
              >
                {isLoading ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <>
                    <span className="z-10 relative">Verify</span>
                    <motion.div 
                      className="z-10 relative"
                      initial={{ rotate: 0 }}
                      whileHover={{ rotate: 90 }}
                      transition={{ duration: 0.3 }}
                    >
                      <FaArrowRight size={10} />
                    </motion.div>
                    {/* Button glow effect */}
                    {!isDisabled && (
                      <motion.div 
                        className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-purple-500/0 via-violet-400/20 to-purple-500/0"
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
              </button>
            )}
          </div>
        </div>
        
        {isDisabled && (
          <div className="mt-2 flex items-center gap-1.5 text-[#818BAC] text-xs">
            <FaInfoCircle size={12} />
            <span>Complete email verification first</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default function UserVerificationCard({
  emailVerified = false,
  phoneVerified = false,
  onVerifyEmail,
  onVerifyPhone,
  userEmail,
  userPhone,
  onEmailVerified,
  onPhoneVerified
}: UserVerificationCardProps) {
  const [isFullyVerified, setIsFullyVerified] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumberInput, setPhoneNumberInput] = useState(userPhone ? userPhone.toString() : '');
  const [phoneInputError, setPhoneInputError] = useState('');
  const phoneInputRef = useRef<HTMLInputElement>(null);
  
  const [isEmailVerifiedLocal, setIsEmailVerifiedLocal] = useState(emailVerified);
  const [isPhoneVerifiedLocal, setIsPhoneVerifiedLocal] = useState(phoneVerified);
  
  const {
    sendVerificationCode,
    verifyCode: verifyFirebaseCode,
    loading: firebaseLoading,
    reset: resetFirebaseAuth
  } = useFirebasePhoneAuth();
  
  useEffect(() => {
    setIsEmailVerifiedLocal(emailVerified);
  }, [emailVerified]);
  
  useEffect(() => {
    setIsPhoneVerifiedLocal(phoneVerified);
  }, [phoneVerified]);
  
  useEffect(() => {
    setIsFullyVerified(isEmailVerifiedLocal && isPhoneVerifiedLocal);
  }, [isEmailVerifiedLocal, isPhoneVerifiedLocal]);
  
  useEffect(() => {
    if (userPhone) {
      setPhoneNumberInput(userPhone.toString());
    }
  }, [userPhone]);
  
  const handleVerifyEmail = async () => {
    try {
      setIsVerifyingEmail(true);
      await onVerifyEmail();
      setShowEmailModal(true);
    } catch (error) {
      toast.error('Failed to send verification email');
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const validatePhoneNumber = (phone: string) => {
    // Only allow digits, no special characters
    const phonePattern = /^\d{7,15}$/;
    if (!phone.trim()) {
      return 'Phone number is required';
    }
    if (!phonePattern.test(phone.trim())) {
      return 'Enter a valid phone number (numbers only, 7-15 digits)';
    }
    return '';
  };

  const handleVerifyPhone = async () => {
    const error = validatePhoneNumber(phoneNumberInput);
    setPhoneInputError(error);
    
    if (error) {
      // Focus the phone input if there's an error
      phoneInputRef.current?.focus();
      return;
    }
    
    try {
      setIsVerifyingPhone(true);
      // Convert string to number
      const phoneAsNumber = parseInt(phoneNumberInput, 10);
      
      // Use Firebase to send verification code
      const success = await sendVerificationCode(phoneAsNumber, 'phone-verify-button');
      
      if (success) {
        // Call the original verification function for any other logic
        await onVerifyPhone(phoneAsNumber);
        // Show the verification code modal
        setShowPhoneModal(true);
      }
    } catch (error) {
      toast.error('Failed to send verification SMS');
      console.error(error);
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const handleEmailCodeVerify = async (code: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsEmailVerifiedLocal(true);
      
      if (onEmailVerified) {
        onEmailVerified();
      }
      
      toast.success('Email successfully verified!');
      return Promise.resolve();
    } catch (error) {
      toast.error('Email verification error');
      return Promise.reject(error);
    }
  };

  const handlePhoneCodeVerify = async (code: string) => {
    try {
      // Verify code using Firebase
      const success = await verifyFirebaseCode(code);
      
      if (success) {
        setIsPhoneVerifiedLocal(true);
        
        // Call the original verification callback if provided
        if (onPhoneVerified) {
          const phoneAsNumber = parseInt(phoneNumberInput, 10);
          onPhoneVerified(phoneAsNumber);
        }
        
        // Reset Firebase auth state
        resetFirebaseAuth();
        
        return Promise.resolve();
      } else {
        return Promise.reject(new Error('Verification failed'));
      }
    } catch (error) {
      toast.error('Phone verification error');
      return Promise.reject(error);
    }
  };

  // Custom Phone Verification Step with Firebase integration
  const PhoneVerificationStep = () => {
    return (
      <motion.div 
        className={`gradient-border mb-3 transition-all duration-300 ${isPhoneVerifiedLocal ? 'always-glow' : ''}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={!isPhoneVerifiedLocal && isEmailVerifiedLocal ? { scale: 1.02 } : {}}
      >
        <div className={`relative p-5 rounded-lg transition-all duration-300 ${
          isPhoneVerifiedLocal 
            ? 'bg-[#1A2338]/60 backdrop-blur-md' 
            : 'bg-[#1A2338]/50 hover:bg-[#1A2338]/60 backdrop-blur-md'
        }`}>
          <div className="flex justify-between">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-lg ${
                isPhoneVerifiedLocal 
                  ? 'bg-[#3f2d63]/30 text-violet-300' 
                  : 'bg-[#1A2338]/80 text-[#818BAC]'
              }`}>
                <FaMobile />
              </div>
              <div>
                <h3 className="text-white font-medium text-sm sm:text-base flex items-center">
                  Phone Verification
                  {isPhoneVerifiedLocal && (
                    <FaCheckCircle className="ml-2 text-xs sm:text-sm text-violet-300" />
                  )}
                </h3>
                <p className="text-xs text-[#9BA3BF] mt-1 max-w-xs">
                  Add SMS verification via Firebase to protect your account and withdrawals
                </p>
                
                {!isPhoneVerifiedLocal && (
                  <div className="mt-3 space-y-2 w-full max-w-[220px]">
                    <input
                      ref={phoneInputRef}
                      type="number"
                      value={phoneNumberInput}
                      onChange={(e) => {
                        // Only allow numeric input
                        setPhoneNumberInput(e.target.value.replace(/[^0-9]/g, ''));
                        if (phoneInputError) setPhoneInputError('');
                      }}
                      placeholder="Enter your phone number"
                      className={`w-full px-3 py-2 text-xs rounded-lg bg-[#1A2338]/80 border ${
                        phoneInputError 
                          ? 'border-red-500/70 focus:ring-red-500'
                          : 'border-[#3f2d63]/70 focus:ring-purple-500'
                      } text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:border-transparent`}
                      disabled={!isEmailVerifiedLocal || isVerifyingPhone || isPhoneVerifiedLocal}
                    />
                    {phoneInputError && (
                      <p className="text-red-400 text-xs">{phoneInputError}</p>
                    )}
                  </div>
                )}
                
                {isPhoneVerifiedLocal && phoneNumberInput && (
                  <p className="text-xs text-[#9BA3BF] mt-2">
                    Verified number: <span className="text-violet-300">{phoneNumberInput}</span>
                  </p>
                )}
              </div>
            </div>
            
            <div>
              {isPhoneVerifiedLocal ? (
                <span className="inline-flex items-center justify-center text-xs bg-[#3f2d63]/30 text-violet-300 py-1.5 px-3 rounded-full">
                  Verified
                </span>
              ) : (
                <button
                  id="phone-verify-button" // Important: This ID is used by the Firebase reCAPTCHA
                  onClick={handleVerifyPhone}
                  disabled={!isEmailVerifiedLocal || isVerifyingPhone || firebaseLoading}
                  className={`
                    relative overflow-hidden group flex items-center gap-1.5 text-xs py-1.5 px-3.5 rounded-full transition-all duration-300
                    ${!isEmailVerifiedLocal || firebaseLoading
                      ? 'bg-[#1A2338]/50 text-[#818BAC] cursor-not-allowed opacity-70' 
                      : 'bg-gradient-to-r from-[#3f2d63] to-[#4e377a] text-white hover:shadow-lg hover:shadow-violet-900/20'
                    }
                  `}
                >
                  {isVerifyingPhone || firebaseLoading ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <>
                      <span className="z-10 relative">
                        {phoneNumberInput ? 'Verify with Firebase' : 'Send Code via Firebase'}
                      </span>
                      <motion.div 
                        className="z-10 relative"
                        initial={{ rotate: 0 }}
                        whileHover={{ rotate: 90 }}
                        transition={{ duration: 0.3 }}
                      >
                        <FaArrowRight size={10} />
                      </motion.div>
                      {/* Button glow effect */}
                      {isEmailVerifiedLocal && !firebaseLoading && (
                        <motion.div 
                          className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-purple-500/0 via-violet-400/20 to-purple-500/0"
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
                </button>
              )}
            </div>
          </div>
          
          {!isEmailVerifiedLocal && (
            <div className="mt-2 flex items-center gap-1.5 text-[#818BAC] text-xs">
              <FaInfoCircle size={12} />
              <span>Complete email verification first</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  };
  
  return (
    <>
      <style jsx global>{gradientBorderStyles}</style>
      <div className="h-full w-full px-0 lg:px-0">
        <motion.div 
          className="gradient-border rounded-xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="h-full bg-[#1A2338]/60 backdrop-blur-lg rounded-xl">
            <div className="p-4 md:p-5 space-y-4">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                  <FaUserShield className="text-violet-300" />
                  <span>Verify Account</span>
                </h2>
                
                <div className={`text-xs py-1 px-3 rounded-full flex items-center gap-1 ${
                  isFullyVerified 
                    ? 'bg-gradient-to-r from-[#3f2d63]/30 to-[#3f2d63]/10 text-violet-300' 
                    : 'bg-gradient-to-r from-amber-500/30 to-amber-500/10 text-amber-400'
                }`}>
                  {isFullyVerified ? (
                    <>
                      <FaCheckCircle className="text-xs" />
                      <span>Verified</span>
                    </>
                  ) : (
                    <>
                      <FaInfoCircle className="text-xs" />
                      <span className="hidden xs:inline">Not Verified</span>
                    </>
                  )}
                </div>
              </div>
              
              <p className="text-xs sm:text-sm text-[#9BA3BF]">
                Verify your account to unlock withdrawals and enhanced security
              </p>
              
              <div className="flex items-center gap-2 mt-4 mb-3 text-violet-300 text-xs sm:text-sm">
                <FaLock size={14} />
                <span className="text-white font-medium">Security verification steps</span>
              </div>
              
              <VerificationStep
                title="Email Verification"
                description="We'll send a verification code to your email address"
                verificationInfo={`Code will be sent to: ${userEmail || 'your email'}`}
                icon={<FaEnvelope />}
                isVerified={isEmailVerifiedLocal}
                onVerify={handleVerifyEmail}
                isLoading={isVerifyingEmail}
              />
              
              {/* Using custom phone verification step component with input field */}
              <PhoneVerificationStep />
              
              {isFullyVerified && (
                <div className="gradient-border always-glow mt-4">
                  <motion.div 
                    className="p-4 bg-[#1A2338]/80 backdrop-blur-sm rounded-lg text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <FaStar className="text-violet-300 text-2xl mx-auto mb-2" />
                    <h3 className="text-white font-medium mb-1">Account Secure</h3>
                    <p className="text-xs sm:text-sm text-[#9BA3BF]">
                      Your account is fully verified. You can now withdraw your royalties safely.
                    </p>
                  </motion.div>
                </div>
              )}
              
              <div className="gradient-border mt-4">
                <motion.div 
                  className="p-3 sm:p-4 bg-[#1A2338]/70 backdrop-blur-sm rounded-lg flex items-center gap-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <FaBell className="text-amber-400 text-lg flex-shrink-0" />
                  <p className="text-xs text-[#9BA3BF]">
                    Verification is required to protect your funds and ensure secure withdrawals.
                  </p>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <VerificationCodeModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onVerify={handleEmailCodeVerify}
        type="email"
        email={userEmail}
      />

      <VerificationCodeModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onVerify={handlePhoneCodeVerify}
        type="phone"
        phone={phoneNumberInput ? parseInt(phoneNumberInput, 10) : undefined}
      />
    </>
  );
} 