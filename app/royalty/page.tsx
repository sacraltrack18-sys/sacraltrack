"use client";

import { useEffect, useState } from 'react';
import RoyaltyLayout from "@/app/layouts/RoyaltyLayout";
import RoyaltyDashboard from "@/app/components/royalty/RoyaltyDashboard";
import PurchaseNotification from "@/app/components/notifications/PurchaseNotification";
import WithdrawalNotifications from "@/app/components/notifications/WithdrawalNotification";
import UserVerificationCard from "@/app/components/royalty/UserVerificationCard";
import { useRoyaltyManagement } from "@/app/hooks/useRoyaltyManagement";
import { usePurchaseNotifications } from "@/app/hooks/usePurchaseNotifications";
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useUser } from "@/app/context/user";
import { FaMoneyBillWave, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import { auth } from '../firebase/firebase';
import { useEffect as useEffectFirebase } from 'react';
import useFirebasePhoneAuth from '@/app/hooks/useFirebasePhoneAuth';
import useAppwriteEmailVerification from '@/app/hooks/useAppwriteEmailVerification';
import VerificationCodeModal from "@/app/components/royalty/VerificationCodeModal";
import FirebasePhoneAuth from "@/app/components/royalty/FirebasePhoneAuth";
import { account } from '@/libs/AppWriteClient';

export default function RoyaltyPage() {
  const { royaltyData, loading, error, notifications, refreshRoyaltyData, forceRefresh } = useRoyaltyManagement();
  const { currentNotification, dismissNotification } = usePurchaseNotifications();
  const [currentNotificationState, setCurrentNotificationState] = useState<any>(null);
  const [withdrawalNotifications, setWithdrawalNotifications] = useState(notifications);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const userContext = useUser();
  
  // Verification states
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [phoneVerified, setPhoneVerified] = useState<boolean>(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState<boolean>(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState<boolean>(false);
  
  // Firebase phone authentication state
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);
  const [verificationPhoneNumber, setVerificationPhoneNumber] = useState<number | null>(null);
  const [showRecaptcha, setShowRecaptcha] = useState<boolean>(false);
  
  // Constants
  const FIREBASE_VERIFY_BUTTON_ID = 'firebase-phone-verify-button';
  
  // Get user's email and phone from context
  const userEmail = userContext?.user ? (userContext.user as any).email : undefined;
  const userPhone = userContext?.user ? 
    (typeof (userContext.user as any).phone === 'string' ? 
      parseInt((userContext.user as any).phone, 10) :
      (userContext.user as any).phone) 
    : undefined;
  
  // Отладочный вывод email
  useEffect(() => {
    console.log('User context:', userContext?.user);
    console.log('RoyaltyPage: userEmail =', userEmail);
    
    // Если email не найден в контексте пользователя, получим его из Appwrite
    if (!userEmail && userContext?.user) {
      const getEmailFromAppwrite = async () => {
        try {
          const accountInfo = await account.get();
          if (accountInfo && accountInfo.email) {
            console.log('Got email from Appwrite account:', accountInfo.email);
            // Обновляем email в контексте пользователя
            if (userContext?.user) {
              (userContext.user as any).email = accountInfo.email;
            }
          }
        } catch (error) {
          console.error('Error getting email from Appwrite account:', error);
        }
      };
      
      getEmailFromAppwrite();
    }
  }, [userContext?.user, userEmail]);
  
  // Initialize Firebase phone auth hook
  const { 
    sendVerificationCode, 
    verifyCode, 
    loading: firebaseLoading, 
    reset: resetFirebaseAuth 
  } = useFirebasePhoneAuth();
  
  // Initialize Appwrite email verification hook
  const {
    sendVerification,
    checkEmailVerification,
    loading: emailVerificationLoading
  } = useAppwriteEmailVerification();
  
  // Check verification status on load
  useEffect(() => {
    if (userContext?.user) {
      const checkEmailStatus = async () => {
        try {
          const isEmailVerified = await checkEmailVerification();
          setEmailVerified(isEmailVerified);
          
          if (userContext?.user) {
            (userContext.user as any).email_verified = isEmailVerified;
            
            if (!userEmail) {
              try {
                const accountInfo = await account.get();
                if (accountInfo && accountInfo.email) {
                  console.log('Got email from Appwrite account:', accountInfo.email);
                  (userContext.user as any).email = accountInfo.email;
                }
              } catch (error) {
                console.error('Error getting email from Appwrite account:', error);
              }
            }
          }
        } catch (error) {
          console.error('Error checking email verification status:', error);
        }
      };
      
      checkEmailStatus();
      setPhoneVerified(userContext.user?.hasOwnProperty('phone_verified') ? Boolean((userContext.user as any).phone_verified) : false);
    }
  }, [userContext?.user, userEmail]);

  // Firebase initialization effect
  useEffectFirebase(() => {
    // Check if Firebase is initialized
    if (auth) {
      console.log('Firebase Authentication initialized successfully');
    }
    
    // Update UI if user is already authenticated with phone
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && user.phoneNumber) {
        // If Firebase user has a verified phone, update our local state
        setPhoneVerified(true);
        
        // Update our user context
        if (userContext?.user) {
          const phoneAsNumber = parseInt(user.phoneNumber.replace(/\D/g, ''), 10);
          (userContext.user as any).phone = phoneAsNumber;
          (userContext.user as any).phone_verified = true;
        }
      }
    });
    
    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Transform withdrawal history data to match expected format using type assertion
  const transformedWithdrawalHistory = (royaltyData.withdrawalHistory || []).map(record => {
    // Use type assertion to override type checking
    const typedRecord = record as any;
    return {
      id: typedRecord.id || typedRecord.$id || '',
      amount: typedRecord.amount?.toString() || '0',
      status: typedRecord.status || 'pending',
      withdrawal_date: typedRecord.created_at || typedRecord.date || new Date().toISOString(),
      withdrawal_method: typedRecord.method || 'bank_transfer',
      processing_fee: typedRecord.fee || '0',
      currency: typedRecord.currency || 'USD',
      withdrawal_details: {
        bank_transfer: typedRecord.bankDetails ? {
          bank_name: typedRecord.bankDetails.bankName || '',
          account_number: typedRecord.bankDetails.accountNumber || ''
        } : undefined
      }
    };
  });

  useEffect(() => {
    setWithdrawalNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    setCurrentNotificationState(currentNotification);
  }, [currentNotification]);

  const dismissWithdrawalNotification = (index: number) => {
    setWithdrawalNotifications(prev => prev.filter((_, i) => i !== index));
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await forceRefresh();
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Add an Appwrite connection check function
  const checkAppwriteConnection = async () => {
    try {
      const { checkAppwriteConnection: checkConnection } = await import('@/libs/AppWriteClient');
      const connectionStatus = await checkConnection();
      console.log('Appwrite connection status:', connectionStatus);
      
      if (!connectionStatus.connected || !connectionStatus.sessionValid) {
        console.error('Appwrite connection issues detected:', connectionStatus);
        toast.error('Connection issues detected. This might affect verification emails.');
      }
      return connectionStatus;
    } catch (error) {
      console.error('Failed to check Appwrite connection:', error);
      return { connected: false, error };
    }
  };

  // Add Appwrite connection check on page load
  useEffect(() => {
    checkAppwriteConnection();
  }, []);

  // Enhanced verification handlers
  const handleVerifyEmail = async () => {
    try {
      setIsVerifyingEmail(true);
      
      // Create verification URL with complete path including domain
      const verificationUrl = `${window.location.origin}/verify-email`;
      console.log('Sending verification to URL:', verificationUrl);
      
      // Call sendVerification with proper error handling
      const result = await sendVerification(verificationUrl);
      
      if (result && result.success) {
        // Show an informative toast message
        toast((t) => (
          <div className="flex flex-col gap-2">
            <div className="font-medium">Email verification sent!</div>
            <div className="text-sm">
              Please check both your inbox and spam folder. If you don't receive the email within a few minutes, you can try again.
            </div>
            <button 
              className="mt-2 bg-blue-500 text-white px-3 py-1 rounded-md text-sm"
              onClick={() => toast.dismiss(t.id)}
            >
              Got it
            </button>
          </div>
        ), { duration: 10000 });
      } else if (result && result.error) {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      toast.error(error.message || 'Failed to send verification email');
    } finally {
      setIsVerifyingEmail(false);
    }
  };
  
  // Создаем обертку, чтобы соответствовать ожидаемому типу Promise<void>
  const handleVerifyPhoneWrapper = async (phoneNumber: number): Promise<void> => {
    try {
      // Показываем reCAPTCHA перед отправкой кода
      setShowRecaptcha(true);
      await handleVerifyPhone(phoneNumber);
    } catch (error) {
      // Ошибки уже обрабатываются в handleVerifyPhone
      setShowRecaptcha(false);
    }
  };
  
  // Внутренняя реализация, которая возвращает boolean
  const handleVerifyPhone = async (phoneNumber: number): Promise<boolean> => {
    try {
      setIsVerifyingPhone(true);
      
      // Store phone number for verification modal
      setVerificationPhoneNumber(phoneNumber);
      
      // Attempt to send verification code via Firebase
      const success = await sendVerificationCode(phoneNumber, FIREBASE_VERIFY_BUTTON_ID);
      
      if (success) {
        // Show verification code modal if code was sent successfully
        setShowVerificationModal(true);
        // Hide reCAPTCHA after successful code sending
        setShowRecaptcha(false);
        return true;
      } else {
        throw new Error('Failed to send verification code');
      }
    } catch (error: any) {
      console.error('Error in handleVerifyPhone:', error);
      const errorMessage = error.message || 'Failed to send verification code';
      toast.error(errorMessage);
      // Hide reCAPTCHA when error occurs
      setShowRecaptcha(false);
      throw error;
    } finally {
      setIsVerifyingPhone(false);
    }
  };
  
  // Handle verification code submission
  const handlePhoneCodeVerify = async (code: string): Promise<void> => {
    try {
      // Verify code with Firebase
      const success = await verifyCode(code);
      
      if (success && verificationPhoneNumber) {
        // Update local state
        setPhoneVerified(true);
        
        // Call the callback to update parent component state
        await handlePhoneVerified(verificationPhoneNumber);
        
        // Close modal
        setShowVerificationModal(false);
        resetFirebaseAuth();
      } else {
        throw new Error('Verification failed');
      }
    } catch (error) {
      console.error('Error in handlePhoneCodeVerify:', error);
      throw error; // Rethrow for the modal to handle the error state
    }
  };

  // Phone verification completed handler
  const handlePhoneVerified = async (phoneNumber: number) => {
    setPhoneVerified(true);
    
    // Save phone number to user profile
    if (userContext?.user) {
      (userContext.user as any).phone = phoneNumber;
      (userContext.user as any).phone_verified = true;
      
      // Here you would typically call your API to update the user profile
      try {
        // Example API call to update user profile
        const response = await fetch('/api/user/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            phone: phoneNumber, 
            phone_verified: true 
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to update profile');
        }
        
        console.log(`Verified phone ${phoneNumber} saved to user profile`);
      } catch (error) {
        console.error('Error updating profile:', error);
        // Still continue as Firebase verification was successful
      }
    }
    
    toast.success('Phone successfully verified with Firebase and saved to your profile!');
  };
  
  // Email verification completed handler
  const handleEmailVerified = () => {
    setEmailVerified(true);
    
    // Обновляем статус в контексте пользователя
    if (userContext?.user) {
      (userContext.user as any).email_verified = true;
    }
    
    toast.success('Email successfully verified!');
  };

  useEffect(() => {
    // Check Appwrite configuration and connection on component mount
    const checkAppwrite = async () => {
      try {
        const { checkAppwriteConnection } = await import('@/libs/AppWriteClient');
        const connectionStatus = await checkAppwriteConnection();
        console.log('Appwrite connection status:', connectionStatus);
        
        if (!connectionStatus.connected || !connectionStatus.sessionValid) {
          console.error('Appwrite connection issues detected:', connectionStatus);
          toast.error('Connection issues detected. This might affect verification emails.');
        }
      } catch (error) {
        console.error('Failed to check Appwrite connection:', error);
      }
    };

    checkAppwrite();
    
    // Проверяем наличие пользователя
    if (userContext?.user) {
      const userData = userContext.user as any;
      
      // Check email verification status
      if (userData.email_verified) {
        setEmailVerified(true);
      }
      
      // Check phone verification status
      if (userData.phone_verified) {
        setPhoneVerified(true);
      }
    }
  }, [userContext?.user]);

  return (
    <RoyaltyLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-[1400px] mx-auto pb-10 pt-20 px-4 sm:px-6 md:px-6 lg:px-8"
      >
        {/* Mobile Actions Header */}
        <div className="lg:hidden sticky top-16 z-10 bg-[#1A2338]/80 backdrop-blur-md px-4 py-3 mb-5 border-b border-[#3f2d63]/20 rounded-lg mobile-header">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FaMoneyBillWave className="text-violet-300" />
              <span>Royalty Dashboard</span>
            </h2>
            
            <div className={`text-xs py-1.5 px-3 rounded-full flex items-center gap-1.5 transition-all duration-300 ${
              emailVerified && phoneVerified
                ? 'bg-gradient-to-r from-[#3f2d63]/30 to-[#4e377a]/30 text-violet-300 shadow-sm shadow-purple-500/10' 
                : 'bg-gradient-to-r from-amber-500/20 to-amber-400/20 text-amber-400'
            }`}>
              {emailVerified && phoneVerified ? (
                <>
                  <FaCheckCircle className="text-xs" />
                  <span>Verified</span>
                </>
              ) : (
                <>
                  <FaInfoCircle className="text-xs" />
                  <span>Verify Account</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-t-2 border-b-2 border-violet-300 rounded-full animate-spin mb-4"></div>
            <p className="text-[#818BAC] animate-pulse">Loading your royalty dashboard...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-16">
            <FaInfoCircle className="text-red-400 text-4xl mx-auto mb-4" />
            <h3 className="text-white text-xl mb-2">Something went wrong</h3>
            <p className="text-[#818BAC] mb-6">We couldn't load your royalty data at this time.</p>
            <button 
              onClick={handleRefresh}
              className="px-4 py-2 bg-[#3f2d63] text-white rounded-lg hover:bg-[#4e377a] transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Royalty Dashboard */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-8 order-2 lg:order-1"
            >
              <RoyaltyDashboard 
                balance={royaltyData.balance}
                totalEarned={royaltyData.totalEarned}
                pendingAmount={royaltyData.pendingAmount}
                withdrawnAmount={royaltyData.withdrawnAmount}
                tracksSold={royaltyData.tracksSold}
                transactions={royaltyData.transactions}
                withdrawalHistory={transformedWithdrawalHistory}
              />
            </motion.div>

            {/* Right Column - Verification Cards */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-4 order-1 lg:order-2 space-y-6"
            >
              <UserVerificationCard
                emailVerified={emailVerified}
                phoneVerified={phoneVerified}
                onVerifyEmail={handleVerifyEmail}
                onVerifyPhone={handleVerifyPhoneWrapper}
                userEmail={userEmail}
                userPhone={userPhone}
                onEmailVerified={handleEmailVerified}
                onPhoneVerified={handlePhoneVerified}
              />
            </motion.div>
          </div>
        )}

        {/* Modals and Notifications */}
        <VerificationCodeModal
          isOpen={showVerificationModal}
          onClose={() => {
            setShowVerificationModal(false);
            setShowRecaptcha(false);
            resetFirebaseAuth();
          }}
          onVerify={handlePhoneCodeVerify}
          type="phone"
          phone={verificationPhoneNumber?.toString()}
          onPhoneChange={(newPhone) => {
            const phoneAsNumber = parseInt(newPhone.replace(/\D/g, ''), 10);
            setVerificationPhoneNumber(phoneAsNumber);
          }}
          onPhoneSubmit={handleVerifyPhone}
        />

        {currentNotificationState && (
          <PurchaseNotification
            buyer={currentNotificationState.buyer}
            track={currentNotificationState.track}
            onClose={() => setCurrentNotificationState(null)}
          />
        )}

        <WithdrawalNotifications
          notifications={withdrawalNotifications}
          onDismiss={dismissWithdrawalNotification}
        />

        <FirebasePhoneAuth 
          buttonId={FIREBASE_VERIFY_BUTTON_ID} 
          isVisible={showRecaptcha} 
        />
      </motion.div>
    </RoyaltyLayout>
  );
}
