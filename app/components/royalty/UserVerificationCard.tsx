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
  FaSpinner,
  FaAt
} from 'react-icons/fa';
import VerificationCodeModal from './VerificationCodeModal';
import { toast } from 'react-hot-toast';
import useTwilioPhoneAuth from '@/app/hooks/useTwilioPhoneAuth';

// Updated border styles with minimal design - more neutral version
const gradientBorderStyles = `
  .gradient-border {
    position: relative;
    z-index: 0;
    border-radius: 0.75rem;
    overflow: hidden;
    transition: all 0.3s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
  
  .gradient-border::after {
    content: '';
    position: absolute;
    z-index: -1;
    left: 0px;
    top: 0px;
    width: 100%;
    height: 100%;
    background: linear-gradient(145deg, #1A2338, #1c2437);
    border-radius: 0.75rem;
  }
  
  /* Very subtle border by default - even more neutral color */
  .gradient-border {
    border: 1px solid rgba(255, 255, 255, 0.01);
  }
  
  /* Add subtle box shadow on hover for additional effect - more neutral */
  .gradient-border:hover {
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.07);
    transform: translateY(-1px);
  }
  
  /* Keep the verification success card always glowing with subtle indicator - less bright */
  .always-glow {
    border: 1px solid rgba(255, 255, 255, 0.02);
  }
  
  /* Style for attracting attention to the phone verification button */
  .attention-phone-button {
    animation: pulse-phone-button 1s ease-in-out infinite alternate;
    box-shadow: 0 0 10px rgba(111, 76, 255, 0.5);
  }
  
  @keyframes pulse-phone-button {
    0% {
      transform: scale(1);
      box-shadow: 0 0 5px rgba(111, 76, 255, 0.3);
    }
    100% {
      transform: scale(1.05);
      box-shadow: 0 0 15px rgba(111, 76, 255, 0.7);
    }
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
  showPhoneVerification?: boolean;
}

interface VerificationStepProps {
  title: string;
  description: string;
  verificationInfo?: string;
  icon: React.ReactNode;
  isVerified: boolean;
  onVerify: () => void;
  isLoading: boolean;
}

const VerificationStep = ({ 
  title, 
  description, 
  verificationInfo, 
  icon, 
  isVerified, 
  onVerify,
  isLoading 
}: VerificationStepProps) => (
    <motion.div 
      className={`gradient-border mb-3 transition-all duration-300 ${isVerified ? 'always-glow' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!isVerified ? { scale: 1.01, y: -2 } : {}}
    >
      <div className={`relative p-5 rounded-lg transition-all duration-300 ${
        isVerified 
          ? 'bg-gradient-to-br from-[#1A2338] to-[#1A2338]/95' 
          : 'bg-gradient-to-br from-[#1A2338] to-[#1A2338]/90 hover:from-[#1A2338] hover:to-[#1f2942]'
      }`}>
        {/* Тонкая декоративная линия сверху для верифицированных карточек - более нейтральная */}
        {isVerified && (
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent"></div>
        )}
        
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-lg ${
              isVerified 
                ? 'bg-[#20DDBB]/5 text-[#20DDBB]' 
                : 'bg-[#1A2338]/80 text-[#818BAC]'
            }`}>
              {icon}
            </div>
            <div>
              <h3 className="text-white font-medium text-sm sm:text-base flex items-center">
                {title}
                {isVerified && (
                  <FaCheckCircle className="ml-2 text-xs sm:text-sm text-[#20DDBB]" />
                )}
              </h3>
              
            {verificationInfo && (
                <div className="mt-1.5 mb-2">
                <span className="text-sm font-medium text-[#20DDBB]">{verificationInfo}</span>
                  {isVerified && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 bg-[#20DDBB]/5 text-[#20DDBB] rounded">verified</span>
                  )}
                </div>
              )}
              
              <p className="text-xs text-[#9BA3BF] mt-1 max-w-xs">
                {description}
              </p>
            </div>
          </div>
          
          <div>
            {isVerified ? (
              <span className="inline-flex items-center justify-center text-xs bg-[#20DDBB]/5 text-[#20DDBB] py-1.5 px-3 rounded-full">
                Verified
              </span>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onVerify}
                disabled={isLoading}
                className={`
                  relative overflow-hidden group flex items-center gap-1.5 text-xs py-1.5 px-3.5 rounded-full transition-all duration-300
                ${isLoading
                    ? 'bg-[#1A2338]/50 text-[#818BAC] cursor-not-allowed opacity-70' 
                    : 'bg-gradient-to-r from-[#20DDBB]/70 to-[#20DDBB]/50 text-white hover:shadow-lg hover:shadow-[#1A2338]/20'
                  }
                `}
              >
                {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                  <span>Verify</span>
                      <FaArrowRight size={10} />
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

const EmailDisplay = ({ email }: { email?: string }) => {
  if (!email) return null;
  
  return (
    <div className="flex items-center gap-2 p-3 mt-3 mb-1 bg-[#1f2942]/70 rounded-lg border border-white/5">
      <FaAt className="text-[#20DDBB]" />
      <div className="text-white text-sm font-medium overflow-hidden text-ellipsis">
        {email}
      </div>
    </div>
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
  onPhoneVerified,
  showPhoneVerification = true
}: UserVerificationCardProps) {
  const [isFullyVerified, setIsFullyVerified] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumberInput, setPhoneNumberInput] = useState(userPhone ? userPhone.toString() : '');
  const [phoneInputError, setPhoneInputError] = useState('');
  const phoneInputRef = useRef<HTMLInputElement>(null);
  
  // Добавляем состояние для отслеживания статуса отправки email
  const [emailSendStatus, setEmailSendStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [emailSendTimestamp, setEmailSendTimestamp] = useState<number | null>(null);
  
  // Отладочный вывод email
  useEffect(() => {
    console.log('UserVerificationCard: userEmail =', userEmail);
  }, [userEmail]);
  
  const [isEmailVerifiedLocal, setIsEmailVerifiedLocal] = useState(emailVerified);
  const [isPhoneVerifiedLocal, setIsPhoneVerifiedLocal] = useState(phoneVerified);
  
  const {
    sendVerificationCode,
    verifyCode: verifyTwilioCode,
    loading: twilioLoading,
    reset: resetTwilioAuth
  } = useTwilioPhoneAuth();
  
  useEffect(() => {
    setIsEmailVerifiedLocal(emailVerified);
    
    // Когда email верифицирован, но телефон еще нет, подсветим кнопку верификации телефона
    if (emailVerified && !phoneVerified) {
      // Запускаем визуальный эффект - подсветку кнопки верификации телефона
      const phoneButton = document.getElementById('phone-verify-button');
      if (phoneButton) {
        // Добавляем класс для привлечения внимания
        phoneButton.classList.add('attention-phone-button');
        
        // Через некоторое время удаляем класс
        setTimeout(() => {
          phoneButton.classList.remove('attention-phone-button');
        }, 3000); // 3 секунды анимации
      }
    }
  }, [emailVerified, phoneVerified]);
  
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
      setEmailSendStatus('idle');
      
      // Вызываем функцию отправки верификационного email
      await onVerifyEmail();
      
      // Успешно отправлено
      setEmailSendStatus('sent');
      setEmailSendTimestamp(Date.now());
      toast.success('Verification email sent successfully');
      
      // Не показываем модальное окно
      // setShowEmailModal(true);
    } catch (error) {
      console.error('Error sending verification email:', error);
      setEmailSendStatus('error');
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
    if (!isEmailVerifiedLocal) return;
    
    try {
      setIsVerifyingPhone(true);
      
      // Открываем модальное окно для верификации телефона
      setShowPhoneModal(true);
      
    } catch (error) {
      console.error('Error in handleVerifyPhone:', error);
      toast.error('Failed to initialize phone verification');
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const handlePhoneCodeVerify = async (code: string) => {
    try {
      // Verify code using Twilio
      const success = await verifyTwilioCode(code);
      
      if (success) {
        setIsPhoneVerifiedLocal(true);
        
        // Call the original verification callback if provided
        if (onPhoneVerified) {
          const phoneAsNumber = parseInt(phoneNumberInput, 10);
          onPhoneVerified(phoneAsNumber);
        }
        
        // Reset Twilio auth state
        resetTwilioAuth();
        
        return Promise.resolve();
      } else {
        return Promise.reject(new Error('Verification failed'));
      }
    } catch (error) {
      toast.error('Phone verification error');
      return Promise.reject(error);
    }
  };

  // Custom Phone Verification Step with Twilio integration
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
            ? 'bg-[#1A2338]/50 backdrop-blur-xl' 
            : 'bg-[#1A2338]/40 hover:bg-[#1A2338]/50 backdrop-blur-xl'
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
                
                {phoneNumberInput && (
                  <div className="mt-1.5 mb-2">
                    <span className="text-sm font-medium text-violet-300">{phoneNumberInput}</span>
                    {isPhoneVerifiedLocal && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 bg-violet-900/30 text-violet-300 rounded">verified</span>
                    )}
                  </div>
                )}
                
                <p className="text-xs text-[#9BA3BF] mt-1 max-w-xs">
                  Add SMS verification via Twilio to protect your account and withdrawals
                </p>
              </div>
            </div>
            
            <div>
              {isPhoneVerifiedLocal ? (
                <span className="inline-flex items-center justify-center text-xs bg-[#3f2d63]/30 text-violet-300 py-1.5 px-3 rounded-full">
                  Verified
                </span>
              ) : (
                <button
                  id="phone-verify-button"
                  onClick={handleVerifyPhone}
                  disabled={!isEmailVerifiedLocal || isVerifyingPhone || twilioLoading}
                  className={`
                    relative overflow-hidden group flex items-center gap-1.5 text-xs py-1.5 px-3.5 rounded-full transition-all duration-300
                    ${!isEmailVerifiedLocal || twilioLoading
                      ? 'bg-[#1A2338]/50 text-[#818BAC] cursor-not-allowed opacity-70' 
                      : isEmailVerifiedLocal && !phoneVerified 
                        ? 'bg-gradient-to-r from-[#3f2d63] to-[#6e4ba8] text-white hover:shadow-lg hover:shadow-violet-900/20 animate-pulse' 
                        : 'bg-gradient-to-r from-[#3f2d63] to-[#4e377a] text-white hover:shadow-lg hover:shadow-violet-900/20'
                    }
                  `}
                >
                  {isVerifyingPhone || twilioLoading ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <>
                      <span className="z-10 relative">
                        Verify Phone
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
                      {isEmailVerifiedLocal && !twilioLoading && (
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
          
          {isEmailVerifiedLocal && !isPhoneVerifiedLocal && (
            <div className="mt-2 flex items-center gap-1.5 text-violet-300 text-xs animate-pulse">
              <FaInfoCircle size={12} />
              <span>Email verified! You can now verify your phone number</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  };
  
  return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="gradient-border">
        <div className="bg-[#1A2338]/50 backdrop-blur-xl p-6 rounded-lg">
          <div className="flex items-center gap-2 mb-6">
            <FaUserShield className="text-violet-300 text-xl" />
            <h2 className="text-white text-lg font-medium">Account Verification</h2>
              </div>
              
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-violet-300 text-xs sm:text-sm">
                <FaLock size={14} />
                <span className="text-white font-medium">Security verification steps</span>
              </div>
              
              {/* Email Verification Card */}
              <motion.div 
                className={`gradient-border mb-3 transition-all duration-300 ${isEmailVerifiedLocal ? 'always-glow' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={!isEmailVerifiedLocal ? { scale: 1.01, y: -2 } : {}}
              >
                <div className={`relative p-5 rounded-lg transition-all duration-300 ${
                  isEmailVerifiedLocal 
                    ? 'bg-gradient-to-br from-[#1A2338]/80 to-[#1A2338]/75 backdrop-blur-xl' 
                    : 'bg-gradient-to-br from-[#1A2338]/70 to-[#1A2338]/60 backdrop-blur-xl hover:from-[#1A2338]/75 hover:to-[#1f2942]/70'
                }`}>
                  {isEmailVerifiedLocal && (
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent"></div>
                  )}
                  
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-lg ${
                        isEmailVerifiedLocal 
                          ? 'bg-[#20DDBB]/5 text-[#20DDBB]' 
                          : 'bg-[#1A2338]/80 text-[#818BAC]'
                      }`}>
                        <FaEnvelope />
                      </div>
                      <div>
                        <h3 className="text-white font-medium text-sm sm:text-base flex items-center">
                          Email Verification
                          {isEmailVerifiedLocal && (
                            <FaCheckCircle className="ml-2 text-xs sm:text-sm text-[#20DDBB]" />
                          )}
                        </h3>
                        
                        {userEmail && (
                          <div className="mt-1.5 mb-2">
                            <span className="text-sm font-medium text-[#20DDBB]">{userEmail}</span>
                            {isEmailVerifiedLocal && (
                              <span className="ml-2 text-xs px-1.5 py-0.5 bg-[#20DDBB]/5 text-[#20DDBB] rounded">verified</span>
                            )}
                          </div>
                        )}
                        
                        <p className="text-xs text-[#9BA3BF] mt-1 max-w-xs">
                          Click the button below to receive a verification link in your email
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      {isEmailVerifiedLocal ? (
                        <span className="inline-flex items-center justify-center text-xs bg-[#20DDBB]/5 text-[#20DDBB] py-1.5 px-3 rounded-full">
                          Verified
                        </span>
                      ) : (
                        emailSendStatus === 'sent' ? (
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center justify-center text-xs bg-[#20DDBB]/5 text-[#20DDBB] py-1.5 px-3 rounded-full">
                              <FaCheckCircle className="mr-1.5" size={12} />
                              Email Sent
                            </span>
                            {emailSendTimestamp && (
                              <p className="text-xs text-[#9BA3BF] mt-1">
                                {new Date(emailSendTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </p>
                            )}
                          </div>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={handleVerifyEmail}
                            disabled={isVerifyingEmail}
                            className={`
                              relative overflow-hidden group flex items-center gap-1.5 text-xs py-1.5 px-3.5 rounded-full transition-all duration-300
                            ${isVerifyingEmail
                                ? 'bg-[#1A2338]/50 text-[#818BAC] cursor-not-allowed opacity-70' 
                                : 'bg-gradient-to-r from-[#20DDBB]/70 to-[#20DDBB]/50 text-white hover:shadow-lg hover:shadow-[#1A2338]/20'
                              }
                            `}
                          >
                            {isVerifyingEmail ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <span>Verify</span>
                                <FaArrowRight size={10} />
                              </>
                            )}
                          </motion.button>
                        )
                      )}
                    </div>
                  </div>
                  
                  {/* Большая кнопка верификации email */}
                  {userEmail && !isEmailVerifiedLocal && (
                    <div className="mt-4">
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleVerifyEmail}
                        disabled={isVerifyingEmail || emailSendStatus === 'sent'}
                        className={`
                          w-full relative overflow-hidden flex items-center justify-center gap-3 text-sm py-4 px-4 rounded-lg transition-all duration-300
                          ${isVerifyingEmail || emailSendStatus === 'sent'
                            ? 'bg-[#1A2338]/50 text-[#818BAC] cursor-not-allowed' 
                            : emailSendStatus === 'error'
                              ? 'bg-gradient-to-r from-[#ff4d4d]/70 to-[#ff6666]/60 text-white hover:shadow-lg hover:shadow-[#ff4d4d]/10'
                              : 'bg-gradient-to-r from-[#20DDBB]/80 to-[#20DDBB]/60 text-white hover:shadow-lg hover:shadow-[#20DDBB]/10'
                          }
                        `}
                      >
                        {isVerifyingEmail ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : emailSendStatus === 'sent' ? (
                          <>
                            <FaCheckCircle size={16} className="text-[#20DDBB]" />
                            <span className="font-medium">Verification Email Sent to {userEmail}</span>
                          </>
                        ) : emailSendStatus === 'error' ? (
                          <>
                            <FaTimesCircle size={16} />
                            <span className="font-medium">Retry Sending to {userEmail}</span>
                          </>
                        ) : (
                          <>
                            <FaEnvelope size={16} />
                            <span className="font-medium">Send Verification Email to {userEmail}</span>
                          </>
                        )}
                      </motion.button>
                      
                      {emailSendStatus === 'sent' && (
                        <p className="text-xs text-center text-[#9BA3BF] mt-2">
                          If you don't see the email, check your spam folder or
                          <button 
                            onClick={handleVerifyEmail}
                            className="ml-1 text-[#20DDBB] hover:underline"
                          >
                            click here to resend
                          </button>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
              
              {showPhoneVerification && <PhoneVerificationStep />}
              
              {isFullyVerified && (
              <div className="gradient-border always-glow mt-6">
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
              
            <div className="gradient-border mt-6">
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
      </div>

      <VerificationCodeModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onVerify={handlePhoneCodeVerify}
        type="phone"
        phone={phoneNumberInput ? parseInt(phoneNumberInput, 10) : undefined}
        onPhoneSubmit={async (phoneNumber) => {
          // Вызываем функцию sendVerificationCode из хука useTwilioPhoneAuth
          const success = await sendVerificationCode(phoneNumber);
          return success;
        }}
      />
    </motion.div>
  );
} 