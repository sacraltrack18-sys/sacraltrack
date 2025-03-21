"use client";

import { useEffect, useState } from 'react';
import MainLayout from "@/app/layouts/MainLayout";
import RoyaltyDashboard from "@/app/components/royalty/RoyaltyDashboard";
import PurchaseNotification from "@/app/components/notifications/PurchaseNotification";
import WithdrawalNotifications from "@/app/components/notifications/WithdrawalNotification";
import { useRoyaltyManagement } from "@/app/hooks/useRoyaltyManagement";
import { usePurchaseNotifications } from "@/app/hooks/usePurchaseNotifications";
import { motion } from 'framer-motion';
import { BsArrowClockwise, BsSpeedometer2 } from 'react-icons/bs';
import { toast } from 'react-hot-toast';

export default function RoyaltyPage() {
  const { royaltyData, loading, error, notifications, refreshRoyaltyData, forceRefresh } = useRoyaltyManagement();
  const { currentNotification, dismissNotification } = usePurchaseNotifications();
  const [currentNotificationState, setCurrentNotificationState] = useState<any>(null);
  const [withdrawalNotifications, setWithdrawalNotifications] = useState(notifications);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  return (
    <MainLayout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-[1500px] mx-auto py-8 px-4 sm:px-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <BsSpeedometer2 className="text-[#20DDBB]" /> 
              <span>Royalty Dashboard</span>
            </h1>
            <p className="text-[#818BAC] text-lg">Track your earnings and manage withdrawals</p>
          </motion.div>
          
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg ${
              isRefreshing || loading 
                ? 'bg-[#3f2d63]/40 text-[#818BAC] cursor-not-allowed' 
                : 'bg-[#3f2d63] text-white hover:bg-[#4a357a] active:bg-[#574186]'
            } transition-all duration-300`}
          >
            <BsArrowClockwise className={`${(isRefreshing || loading) && 'animate-spin'}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </motion.button>
        </div>

        {/* Loading indicator */}
        {loading && !royaltyData.balance && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full rounded-xl bg-[#272B43] border border-[#3f2d63] p-8 flex items-center justify-center space-y-4 h-[300px] text-center"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-[#3f2d63] border-t-[#20DDBB] rounded-full animate-spin"></div>
              <p className="text-[#818BAC] text-lg animate-pulse">Loading your royalty dashboard...</p>
            </div>
          </motion.div>
        )}

        {/* Error state */}
        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full rounded-xl bg-[#272B43] border border-red-500/30 p-8 text-center"
          >
            <h3 className="text-red-400 text-xl font-bold mb-2">Something went wrong</h3>
            <p className="text-[#818BAC]">{error}</p>
            <button 
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        )}

        {/* Main Dashboard */}
        {!loading && !error && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full"
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
        )}

        {/* Purchase Notifications */}
        {currentNotificationState && (
          <PurchaseNotification
            buyer={currentNotificationState.buyer}
            track={currentNotificationState.track}
            onClose={() => setCurrentNotificationState(null)}
          />
        )}

        {/* Withdrawal Notifications */}
        <WithdrawalNotifications
          notifications={withdrawalNotifications}
          onDismiss={dismissWithdrawalNotification}
        />
      </motion.div>
    </MainLayout>
  );
}
