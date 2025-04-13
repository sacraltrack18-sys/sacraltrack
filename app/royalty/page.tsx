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
import { FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import useAppwriteEmailVerification from '@/app/hooks/useAppwriteEmailVerification';
import VerificationCodeModal from "@/app/components/royalty/VerificationCodeModal";
import useTwilioPhoneAuth from '@/app/hooks/useTwilioPhoneAuth';
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
  const [isFullyVerified, setIsFullyVerified] = useState<boolean>(false);
  
  // Twilio phone authentication state
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);
  const [verificationPhoneNumber, setVerificationPhoneNumber] = useState<number | null>(null);
  
  // Get user's email and phone from context
  const userEmail = userContext?.user ? (userContext.user as any).email : undefined;
  const userPhone = userContext?.user ? 
    (typeof (userContext.user as any).phone === 'string' ? 
      parseInt((userContext.user as any).phone, 10) :
      (userContext.user as any).phone) 
    : undefined;
  
  // Update fully verified status
  useEffect(() => {
    setIsFullyVerified(emailVerified && phoneVerified);
  }, [emailVerified, phoneVerified]);
  
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
  
  // Initialize Twilio phone auth hook
  const { 
    sendVerificationCode, 
    verifyCode, 
    loading: twilioLoading, 
    reset: resetTwilioAuth 
  } = useTwilioPhoneAuth();
  
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

  // Check if phone is already verified in user context
  useEffect(() => {
    if (userContext?.user && (userContext.user as any).phone_verified) {
      setPhoneVerified(true);
    }
  }, [userContext?.user]);

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
      
      // Create verification URL with complete path including domain and referrer
      const verificationUrl = `${window.location.origin}/verify-email?referrer=royalty`;
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
      await handleVerifyPhone(phoneNumber);
    } catch (error) {
      // Ошибки уже обрабатываются в handleVerifyPhone
    }
  };
  
  // Внутренняя реализация, которая возвращает boolean
  const handleVerifyPhone = async (phoneNumber: number): Promise<boolean> => {
    try {
      setIsVerifyingPhone(true);
      
      // Store phone number for verification modal
      setVerificationPhoneNumber(phoneNumber);
      
      // Attempt to send verification code via Twilio
      const success = await sendVerificationCode(phoneNumber);
      
      if (success) {
        // Show verification code modal if code was sent successfully
        setShowVerificationModal(true);
        return true;
      } else {
        throw new Error('Failed to send verification code');
      }
    } catch (error: any) {
      console.error('Error in handleVerifyPhone:', error);
      const errorMessage = error.message || 'Failed to send verification code';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsVerifyingPhone(false);
    }
  };
  
  // Handle verification code submission
  const handlePhoneCodeVerify = async (code: string): Promise<void> => {
    try {
      // Verify code with Twilio
      const success = await verifyCode(code);
      
      if (success && verificationPhoneNumber) {
        // Update local state
        setPhoneVerified(true);
        
        // Call the callback to update parent component state
        await handlePhoneVerified(verificationPhoneNumber);
        
        // Close modal
        setShowVerificationModal(false);
        resetTwilioAuth();
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
        // Still continue as Twilio verification was successful
      }
    }
    
    toast.success('Phone successfully verified with Twilio and saved to your profile!');
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
    
    // Проверяем статус верификации из URL параметров
    const url = new URL(window.location.href);
    const emailVerifiedParam = url.searchParams.get('emailVerified');
    
    if (emailVerifiedParam === 'true') {
      console.log('Email verification detected from URL parameter');
      setEmailVerified(true);
      
      // Обновляем статус в контексте пользователя
      if (userContext?.user) {
        (userContext.user as any).email_verified = true;
      }
      
      // Показываем подсказку о следующем шаге
      toast((t) => (
        <div className="flex flex-col gap-2">
          <div className="font-medium">Email successfully verified!</div>
          <div className="text-sm">
            Now you can proceed with phone verification to complete your account setup.
          </div>
          <button 
            className="mt-2 bg-violet-500 text-white px-3 py-1 rounded-md text-sm"
            onClick={() => toast.dismiss(t.id)}
          >
            Got it
          </button>
        </div>
      ), { duration: 5000 });
      
      // Удаляем параметр из URL без перезагрузки страницы
      url.searchParams.delete('emailVerified');
      window.history.replaceState({}, '', url.toString());
    }
    
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
        className="flex flex-col gap-6 p-4 md:p-6 overflow-hidden"
      >
        {isFullyVerified ? (
          <div className="text-xs sm:text-sm text-[#9BA3BF] mb-2">
            <div className="flex items-center gap-1.5">
              <FaCheckCircle className="text-green-400" />
              <span>Your account is fully verified!</span>
            </div>
          </div>
        ) : (
          <div className="text-xs sm:text-sm text-[#9BA3BF] mb-2">
            <div className="flex items-center gap-1.5">
              <FaInfoCircle className="text-amber-400" />
              <span>Complete verification to enable withdrawals</span>
            </div>
          </div>
        )}

        {/* Show verification cards if not fully verified */}
        {!isFullyVerified && (
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
        )}

        <RoyaltyDashboard 
          balance={royaltyData.balance}
          totalEarned={royaltyData.totalEarned}
          pendingAmount={royaltyData.pendingAmount}
          withdrawnAmount={royaltyData.withdrawnAmount}
          tracksSold={royaltyData.tracksSold}
          transactions={royaltyData.transactions || []}
          withdrawalHistory={transformedWithdrawalHistory}
        />
        
        {currentNotificationState && (
          <PurchaseNotification
            buyer={currentNotificationState.buyer}
            track={currentNotificationState.track}
            onClose={() => setCurrentNotificationState(null)}
          />
        )}
        
        {withdrawalNotifications.length > 0 && (
          <WithdrawalNotifications 
            notifications={withdrawalNotifications} 
            onDismiss={dismissWithdrawalNotification}
          />
        )}

        <VerificationCodeModal
          isOpen={showVerificationModal}
          onClose={() => {
            setShowVerificationModal(false);
            resetTwilioAuth();
          }}
          onVerify={handlePhoneCodeVerify}
          type="phone"
          phone={verificationPhoneNumber || undefined}
          onPhoneSubmit={handleVerifyPhone}
        />
      </motion.div>
    </RoyaltyLayout>
  );
}
