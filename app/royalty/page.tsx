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
import { account } from '@/libs/AppWriteClient';

// Флаг для отключения верификации по телефону (можно будет легко включить обратно)
const PHONE_VERIFICATION_ENABLED = false;

export default function RoyaltyPage() {
  const { royaltyData, loading, error, notifications, refreshRoyaltyData, forceRefresh } = useRoyaltyManagement();
  const { currentNotification, dismissNotification } = usePurchaseNotifications();
  const [currentNotificationState, setCurrentNotificationState] = useState<any>(null);
  const [withdrawalNotifications, setWithdrawalNotifications] = useState(notifications || []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const userContext = useUser();
  
  // Verification states
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [phoneVerified, setPhoneVerified] = useState<boolean>(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState<boolean>(false);
  
  // Get user's email from context
  const userEmail = userContext?.user ? (userContext.user as any).email : undefined;
  
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
      
      // Если верификация по телефону отключена, всегда считаем телефон верифицированным
      if (!PHONE_VERIFICATION_ENABLED) {
        setPhoneVerified(true);
      } else {
        // Если верификация включена, берем значение из контекста пользователя
        setPhoneVerified(userContext.user?.hasOwnProperty('phone_verified') ? Boolean((userContext.user as any).phone_verified) : false);
      }
    }
  }, [userContext?.user, userEmail]);

  // Transform withdrawal history data to match expected format using type assertion
  const transformedWithdrawalHistory = (royaltyData?.withdrawalHistory || []).map(record => {
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
    if (notifications && Array.isArray(notifications)) {
      setWithdrawalNotifications(notifications);
    }
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
  
  // Заглушка для обработчика верификации телефона (сохраняем на будущее)
  const handleVerifyPhone = async (phoneNumber: number): Promise<void> => {
    // Если верификация отключена, просто возвращаем Promise
    if (!PHONE_VERIFICATION_ENABLED) {
      return Promise.resolve();
    }
    
    // Код верификации телефона (закомментирован, так как функция отключена)
    // Оставлен для будущей реактивации
    /*
    try {
      // Логика верификации телефона
    } catch (error) {
      console.error('Error verifying phone:', error);
    }
    */
  };
  
  const handleEmailVerified = () => {
    setEmailVerified(true);
    // Обновляем статус верификации в контексте пользователя
    if (userContext?.user) {
      (userContext.user as any).email_verified = true;
    }
    
    toast.success('Email successfully verified!');
    
    // Проверяем соединение с Appwrite
    const checkAppwrite = async () => {
      const status = await checkAppwriteConnection();
      if (!status.connected) {
        toast.error('Server connection issues detected. Status may not update immediately.');
      }
    };
    
    checkAppwrite();
  };

  // Проверяем, нормализованы ли данные для уведомлений
  const normalizeNotification = (notification: any) => {
    if (!notification) return null;
    
    return {
      buyer: notification.buyer || {
        id: notification.buyer_id || "unknown",
        name: notification.buyer_name || "Someone",
        image: notification.buyer_image || "/default-avatar.png"
      },
      track: notification.track || {
        name: notification.track_name || "a track",
        amount: notification.amount || "0.00"
      }
    };
  };

  return (
    <RoyaltyLayout>
      <div className="w-full max-w-7xl pt-20"> {/* Увеличиваем отступ сверху, чтобы заголовки не залезали под навигацию */}
        <div className="flex flex-col lg:flex-row-reverse w-full gap-6"> {/* Меняем направление flex, чтобы карточки верификации были справа */}
          {/* Verification Cards - Right side */}
          <motion.div 
            className="w-full lg:w-1/3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="sticky top-24 space-y-6"> {/* Увеличиваем отступ сверху для sticky позиционирования */}
              {/* Верификационная карточка */}
              <UserVerificationCard
                emailVerified={emailVerified}
                phoneVerified={phoneVerified} 
                onVerifyEmail={handleVerifyEmail}
                onVerifyPhone={handleVerifyPhone}
                userEmail={userEmail}
                onEmailVerified={handleEmailVerified}
                showPhoneVerification={false}
              />

              {/* Information Card */}
              <motion.div 
                className="gradient-border"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <div className="bg-gradient-to-br from-[#1A2338] to-[#1A2338]/90 p-5 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                      <FaInfoCircle size={18} />
                    </div>
                    <h3 className="text-white font-medium">Information</h3>
                  </div>
                  <p className="text-[#9BA3BF] text-sm mb-2">
                    Your earnings are updated in real-time as users purchase your tracks.
                  </p>
                  <p className="text-[#9BA3BF] text-sm mb-2">
                    Withdrawals are processed within 3-5 business days.
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
          
          {/* Main Content - Dashboard section */}
          <motion.div 
            className="w-full lg:w-2/3 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="mb-7"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              {/* Content Header - Removed per user request */}
            </motion.div>
            
            {/* Purchase Notification (animated) */}
            {currentNotificationState && (
              <motion.div 
                className="mb-6" 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <PurchaseNotification
                  buyer={normalizeNotification(currentNotificationState)?.buyer}
                  track={normalizeNotification(currentNotificationState)?.track}
                  onClose={dismissNotification}
                />
              </motion.div>
            )}
            
            {/* Withdrawal Notifications (animated) */}
            {withdrawalNotifications.length > 0 && (
              <motion.div 
                className="mb-6" 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <WithdrawalNotifications
                  notifications={withdrawalNotifications}
                  onDismiss={dismissWithdrawalNotification}
                />
              </motion.div>
            )}
            
            {/* Dashboard Component */}
            <RoyaltyDashboard
              balance={royaltyData?.balance ?? 0}
              totalEarned={royaltyData?.totalEarned ?? 0}
              pendingAmount={royaltyData?.pendingAmount ?? 0}
              withdrawnAmount={royaltyData?.withdrawnAmount ?? 0}
              tracksSold={royaltyData?.tracksSold ?? 0}
              transactions={royaltyData?.transactions ?? []}
              withdrawalHistory={transformedWithdrawalHistory}
            />
          </motion.div>
        </div>
      </div>
    </RoyaltyLayout>
  );
}
