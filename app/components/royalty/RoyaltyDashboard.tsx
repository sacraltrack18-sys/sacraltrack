"use client";

import { BsGraphUp, BsCashStack, BsClock, BsArrowUp, BsArrowDown, BsExclamationCircle, BsCalendar, BsPiggyBank, BsWallet2 } from 'react-icons/bs';
import { format, formatDistance } from 'date-fns';
import { useRoyaltyManagement } from '@/app/hooks/useRoyaltyManagement';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import WithdrawModal from './WithdrawModal';
import { FaMoneyBillWave, FaChartLine, FaHandHoldingUsd, FaHistory, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useUser } from "@/app/context/user";
import { Tooltip } from 'react-tooltip';

interface RoyaltyBalance {
  totalEarned: number;
  availableBalance: number;
}

interface StatsCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
  tooltip?: string;
  className?: string;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const StatsCard = ({ 
  icon, 
  title, 
  value, 
  description = '', 
  trend, 
  onClick, 
  tooltip,
  className = ''
}: StatsCardProps) => (
  <motion.div
    variants={itemVariants}
    whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
    className={`bg-gradient-to-br from-[#272B43] to-[#212539] p-6 rounded-xl border border-[#3f2d63] shadow-lg transition-all duration-300 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    onClick={onClick}
    data-tooltip-id={tooltip ? `tooltip-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined}
    data-tooltip-content={tooltip}
  >
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-[#3f2d63]/30 text-[#20DDBB] text-xl">
          {icon}
        </div>
        <h3 className="text-white font-bold">{title}</h3>
      </div>
      
      {trend && (
        <div className={`flex items-center text-xs px-2 py-1 rounded-full ${
          trend.isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {trend.isPositive ? <BsArrowUp className="mr-1" /> : <BsArrowDown className="mr-1" />}
          {Math.abs(trend.value)}%
        </div>
      )}
    </div>
    
    <p className="text-3xl font-bold text-white mb-1">
      {value}
    </p>
    
    {description && (
      <p className="text-[#818BAC] text-sm">{description}</p>
    )}

    {tooltip && (
      <Tooltip id={`tooltip-${title.replace(/\s+/g, '-').toLowerCase()}`} />
    )}
  </motion.div>
);

interface RoyaltyDashboardProps {
  userId: string;
  balance: number;
  totalEarned: number;
  pendingAmount: number;
  withdrawnAmount: number;
  tracksSold: number;
  transactions: Array<{
    purchase_id: string;
    buyer_id: string;
    buyer_name: string;
    buyer_image: string;
    amount: string;
    transaction_date: string;
    status: string;
  }>;
  withdrawalHistory: Array<{
    id: string;
    amount: string;
    status: string;
    withdrawal_date: string;
    withdrawal_method: string;
    processing_fee: string;
    currency: string;
    withdrawal_details: {
      bank_transfer?: {
        bank_name: string;
        account_number: string;
      };
      visa_card?: {
        card_number: string;
      };
      crypto?: {
        wallet_address: string;
        network: string;
      };
    };
  }>;
}

// Format dates in a user-friendly way
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  
  try {
    // If it's today, display time, otherwise display date
    if (date.toDateString() === now.toDateString()) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else {
      // If it's within the last 7 days, show relative time
      const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo < 7) {
        return formatDistance(date, now, { addSuffix: true });
      } else {
        return format(date, 'MMM d, yyyy');
      }
    }
  } catch (error) {
    console.error('Date formatting error:', error);
    return dateString;
  }
};

export default function RoyaltyDashboard({
  balance,
  totalEarned,
  pendingAmount,
  withdrawnAmount,
  tracksSold,
  transactions = [],
  withdrawalHistory
}: Omit<RoyaltyDashboardProps, 'userId'>) {
  const contextUser = useUser();
  const { requestWithdrawal, getRoyaltyBalance, isLoading, refreshRoyaltyData } = useRoyaltyManagement();
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [statsBalance, setStatsBalance] = useState<RoyaltyBalance>({
    totalEarned: 0,
    availableBalance: 0
  });
  const [activeTab, setActiveTab] = useState<'sales' | 'withdrawals'>('sales');
  const [tableView, setTableView] = useState<'grid' | 'list'>('list');
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  useEffect(() => {
    console.log('RoyaltyDashboard initialized with props:', { 
      balance: balance, 
      totalEarned: totalEarned,
      balanceType: typeof balance,
      isBalanceNull: balance === null,
      isBalanceUndefined: balance === undefined
    });
    
    fetchCurrentBalance();
    
    const balanceUpdateInterval = setInterval(() => {
      console.log('Running scheduled balance update...');
      fetchCurrentBalance(false);
    }, 30000);

    // Add event listener for withdrawal-processed event
    const handleWithdrawalProcessed = (event: CustomEvent) => {
      console.log('Withdrawal processed event received:', event.detail);
      if (event.detail.userId === contextUser?.user?.id) {
        updateDashboardData();
      }
    };

    window.addEventListener('withdrawal-processed', handleWithdrawalProcessed as EventListener);
    
    return () => {
      clearInterval(balanceUpdateInterval);
      window.removeEventListener('withdrawal-processed', handleWithdrawalProcessed as EventListener);
    };
  }, []);

  const updateDashboardData = async () => {
    if (!contextUser?.user?.id) return;
    
    try {
      setIsRefreshingBalance(true);
      console.log('🔄 Updating dashboard data...');
      
      // Refresh royalty data which includes withdrawal history
      await refreshRoyaltyData();
      
      // Fetch current balance
      await fetchCurrentBalance(false);
      
      // Update last update time
      setLastUpdateTime(new Date());
      
      console.log('✅ Dashboard data updated successfully');
    } catch (error) {
      console.error('❌ Failed to update dashboard data:', error);
      toast.error('Failed to update dashboard data. Please refresh the page.');
    } finally {
      setIsRefreshingBalance(false);
    }
  };

  const fetchCurrentBalance = async (showLoading = true) => {
    if (!contextUser?.user?.id) {
      console.log('Cannot fetch balance: User ID not available');
      return;
    }
    
    try {
      if (showLoading) {
        setIsRefreshingBalance(true);
      }
      console.log('Fetching current balance from the database...');
      
      const currentBalance = await getRoyaltyBalance(contextUser.user.id);
      
      console.log('Received current balance from DB:', currentBalance);
      
      setStatsBalance({
        totalEarned: currentBalance.totalEarned || 0,
        availableBalance: currentBalance.availableBalance || 0
      });
      
      console.log('Updated state with fresh balance data from DB');
      setLastUpdateTime(new Date());
    } catch (error) {
      console.error('Failed to fetch current balance:', error);
    } finally {
      if (showLoading) {
        setIsRefreshingBalance(false);
      }
    }
  };

  useEffect(() => {
    console.log('Balance data from props changed:', { 
      balance, 
      totalEarned,
      balanceType: typeof balance,
      isBalanceNull: balance === null,
      isBalanceUndefined: balance === undefined
    });
    loadBalance();
  }, [balance, totalEarned]);

  const loadBalance = async () => {
    try {
      console.log('Loading balance into state - Before update:', { 
        currentState: statsBalance,
        newValues: { totalEarned, balance }
      });
      
      const safeBalance = balance !== undefined && balance !== null ? balance : 0;
      const safeTotalEarned = totalEarned !== undefined && totalEarned !== null ? totalEarned : 0;
      
      setStatsBalance({
        totalEarned: safeTotalEarned,
        availableBalance: safeBalance
      });
      
      console.log('Updated state balance - After update:', {
        totalEarned: safeTotalEarned,
        availableBalance: safeBalance
      });
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const handleOpenWithdrawModal = async () => {
    await fetchCurrentBalance();
    setIsWithdrawModalOpen(true);
  };

  const handleCloseWithdrawModal = async () => {
    setIsWithdrawModalOpen(false);
    await updateDashboardData();
  };

  const handleWithdraw = async (amount: number, method: string, details: any) => {
    try {
      await requestWithdrawal(amount, method, details);
      setIsWithdrawModalOpen(false);
      
      await updateDashboardData();
      
      toast.success('Withdrawal request submitted successfully!', {
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
        iconTheme: {
          primary: '#20DDBB',
          secondary: '#000',
        },
      });
    } catch (error: any) {
      console.error('Withdrawal failed:', error);
      toast.error(error.message || 'Failed to process withdrawal');
      await fetchCurrentBalance();
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#1A2338] p-6 rounded-2xl">
        <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
          <div className="w-12 h-12 border-t-2 border-b-2 border-[#20DDBB] rounded-full animate-spin"></div>
          <p className="text-[#818BAC] animate-pulse">Loading your earnings data...</p>
        </div>
      </div>
    );
  }

  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
  );

  // Sort withdrawal history by date (newest first)
  const sortedWithdrawals = [...withdrawalHistory].sort(
    (a, b) => new Date(b.withdrawal_date).getTime() - new Date(a.withdrawal_date).getTime()
  );

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Detailed Stats Panel */}
      <motion.div 
        variants={itemVariants}
        className="bg-gradient-to-br from-[#1A2338]/90 to-[#131a2d]/90 backdrop-blur-md p-8 rounded-2xl border border-[#3f2d63]/50 shadow-xl"
      >
        {/* Header with Title and Withdraw Button */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
              <FaChartLine className="mr-2 text-[#20DDBB]" />
              Your Earnings Dashboard
            </h2>
            <p className="text-[#818BAC]">Track your revenue, withdrawals and transaction history</p>
          </div>
          <div className="flex flex-wrap sm:flex-row gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenWithdrawModal}
              className="inline-flex items-center px-5 py-2.5 rounded-lg shadow-lg transition-all duration-200 space-x-2 
                bg-gradient-to-r from-emerald-500/90 to-teal-500/90 backdrop-blur-sm text-white hover:from-emerald-600 hover:to-teal-600"
              data-tooltip-id="withdraw-tooltip"
              data-tooltip-content="Withdraw your available funds"
            >
              <FaMoneyBillWave className="text-lg animate-bounce" />
              <span>Withdraw Funds</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={updateDashboardData}
              disabled={isRefreshingBalance}
              className="inline-flex items-center px-3 py-2.5 rounded-lg shadow-lg transition-all duration-200 
                bg-[#1A2338]/80 backdrop-blur-sm text-white hover:bg-[#1A2338] border border-[#3f2d63]/70"
              data-tooltip-id="refresh-tooltip"
              data-tooltip-content="Refresh balance and transaction data"
            >
              <svg 
                className={`w-5 h-5 ${isRefreshingBalance ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </motion.button>
            <Tooltip id="withdraw-tooltip" />
            <Tooltip id="refresh-tooltip" />
          </div>
        </div>

        {/* Main Stats Grid - Only showing Total Earned and Available Balance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StatsCard
            icon={<BsCashStack size={24} />}
            title="Total Earned"
            value={`$${(statsBalance.totalEarned || 0).toFixed(2)}`}
            description="Lifetime earnings from your tracks"
            tooltip="Total amount earned from all your track sales"
            className="backdrop-blur-sm bg-gradient-to-br from-[#272B43]/80 to-[#212539]/80 border-[#3f2d63]/70"
          />
          
          <StatsCard
            icon={<BsWallet2 size={24} />}
            title="Available Balance"
            value={`$${(statsBalance.availableBalance || 0).toFixed(2)}`}
            description={isRefreshingBalance ? "Updating balance..." : `Ready to withdraw • Last updated: ${formatDistance(lastUpdateTime, new Date(), { addSuffix: true })}`} 
            className="backdrop-blur-sm bg-gradient-to-br from-[#272B43]/80 to-[#212539]/80 border-[#3f2d63]/70 border-[#20DDBB]/50"
            tooltip="Amount available for withdrawal"
            onClick={handleOpenWithdrawModal}
          />
        </div>

        {/* Sales & Withdrawals History Tabs */}
        <div className="bg-[#1d2841]/80 backdrop-blur-md rounded-xl p-6 border border-[#3f2d63]/40">
          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-2 items-center">
              <button
                onClick={() => setActiveTab('sales')}
                className={`px-4 py-2 rounded-lg ${
                  activeTab === 'sales' 
                    ? 'bg-[#20DDBB] text-[#0c2a27]' 
                    : 'bg-[#1A2338]/70 backdrop-blur-sm text-[#818BAC] hover:text-white'
                } transition-colors`}
              >
                Recent Sales
              </button>
              <button
                onClick={() => setActiveTab('withdrawals')}
                className={`px-4 py-2 rounded-lg ${
                  activeTab === 'withdrawals' 
                    ? 'bg-[#20DDBB] text-[#0c2a27]' 
                    : 'bg-[#1A2338]/70 backdrop-blur-sm text-[#818BAC] hover:text-white'
                } transition-colors`}
              >
                Withdrawal History
              </button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('withdrawals')}
                className="inline-flex items-center ml-2 px-3 py-2 bg-gradient-to-r from-purple-600/90 to-indigo-600/90 backdrop-blur-sm text-white rounded-lg shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200"
              >
                <FaHistory className="text-sm" />
              </motion.button>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setTableView('list')}
                className={`p-2 rounded-lg ${
                  tableView === 'list' 
                    ? 'bg-[#3f2d63] text-white' 
                    : 'bg-[#1A2338]/70 text-[#818BAC]'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M2 2.5a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h12a.5.5 0 0 0 .5-.5V3a.5.5 0 0 0-.5-.5H2zm1 1v10h10V3.5H3z"/>
                  <path d="M3 4.5h10v1H3v-1zm0 2h10v1H3v-1zm0 2h10v1H3v-1zm0 2h10v1H3v-1z"/>
                </svg>
              </button>
              <button
                onClick={() => setTableView('grid')}
                className={`p-2 rounded-lg ${
                  tableView === 'grid' 
                    ? 'bg-[#3f2d63] text-white' 
                    : 'bg-[#1A2338]/70 text-[#818BAC]'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M1 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V2zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V2zM1 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V7zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V7zM1 12a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-2zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-2zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2z"/>
                </svg>
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* Recent Sales */}
            {activeTab === 'sales' && (
              <motion.div
                key="sales"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {sortedTransactions.length === 0 ? (
                  <div className="text-center py-12 bg-[#131a2d]/80 backdrop-blur-sm rounded-lg">
                    <FaHandHoldingUsd className="text-[#20DDBB]/30 text-5xl mx-auto mb-4" />
                    <p className="text-[#818BAC] text-lg">No transactions yet</p>
                    <p className="text-[#5d6b8c] mt-2">When you sell your tracks, they'll appear here</p>
                  </div>
                ) : tableView === 'list' ? (
                  <div className="space-y-4">
                    {sortedTransactions.map((transaction) => (
                      <motion.div
                        key={transaction.purchase_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.01, backgroundColor: 'rgba(63, 45, 99, 0.2)' }}
                        className="bg-[#1A2338]/80 backdrop-blur-sm rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-all duration-200 border border-[#3f2d63]/30"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#3f2d63]">
                            <img
                              src={transaction.buyer_image || '/default-avatar.png'}
                              alt={transaction.buyer_name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-white font-medium flex items-center">
                              {transaction.buyer_name}
                              <Link href={`/profile/${transaction.buyer_id}`}>
                                <span className="ml-2 text-[#20DDBB] text-xs hover:underline">View Profile</span>
                              </Link>
                            </p>
                            <div className="flex items-center text-[#818BAC] text-sm">
                              <BsCalendar className="mr-1" />
                              {formatDate(transaction.transaction_date)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">${parseFloat(transaction.amount).toFixed(2)}</p>
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs ${
                              transaction.status === 'completed'
                                ? 'bg-green-500/20 text-green-400'
                                : transaction.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedTransactions.map((transaction) => (
                      <motion.div
                        key={transaction.purchase_id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                        className="bg-[#1A2338]/80 backdrop-blur-sm rounded-lg p-4 flex flex-col hover:shadow-md transition-all duration-200 border border-[#3f2d63]/30"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-[#3f2d63]">
                              <img
                                src={transaction.buyer_image || '/default-avatar.png'}
                                alt={transaction.buyer_name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="text-white font-medium text-sm">{transaction.buyer_name}</p>
                            </div>
                          </div>
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs ${
                              transaction.status === 'completed'
                                ? 'bg-green-500/20 text-green-400'
                                : transaction.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                          </span>
                        </div>
                        
                        <div className="mt-auto pt-2 border-t border-[#3f2d63]/20 flex justify-between items-center">
                          <div className="text-[#818BAC] text-xs flex items-center">
                            <BsCalendar className="mr-1" />
                            {formatDate(transaction.transaction_date)}
                          </div>
                          <p className="text-[#20DDBB] font-bold">${parseFloat(transaction.amount).toFixed(2)}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Withdrawal History */}
            {activeTab === 'withdrawals' && (
              <motion.div
                key="withdrawals"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {sortedWithdrawals.length === 0 ? (
                  <div className="text-center py-12 bg-[#131a2d]/80 backdrop-blur-sm rounded-lg">
                    <FaHistory className="text-[#20DDBB]/30 text-5xl mx-auto mb-4" />
                    <p className="text-[#818BAC] text-lg">No withdrawal history</p>
                    <p className="text-[#5d6b8c] mt-2">When you withdraw funds, they'll appear here</p>
                  </div>
                ) : tableView === 'list' ? (
                  <div className="space-y-4">
                    {sortedWithdrawals.map((withdrawal) => (
                      <motion.div
                        key={withdrawal.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.01, backgroundColor: 'rgba(63, 45, 99, 0.2)' }}
                        className="bg-[#1A2338]/80 backdrop-blur-sm rounded-lg p-4 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-full ${
                              withdrawal.status === 'completed' ? 'bg-green-500/20' : 
                              withdrawal.status === 'pending' ? 'bg-yellow-500/20' : 
                              'bg-red-500/20'
                            }`}>
                              {withdrawal.status === 'completed' ? (
                                <FaCheckCircle className="text-green-400" />
                              ) : withdrawal.status === 'pending' ? (
                                <BsClock className="text-yellow-400" />
                              ) : (
                                <BsExclamationCircle className="text-red-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-white font-medium">
                                ${parseFloat(withdrawal.amount).toFixed(2)} {withdrawal.currency}
                              </p>
                              <p className="text-[#818BAC] text-sm">
                                {formatDate(withdrawal.withdrawal_date)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[#818BAC] text-sm capitalize mb-1">
                              Via {withdrawal.withdrawal_method ? withdrawal.withdrawal_method.replace('_', ' ') : 'Unknown Method'}
                            </p>
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs ${
                                withdrawal.status === 'completed'
                                  ? 'bg-green-500/20 text-green-400'
                                  : withdrawal.status === 'pending'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 text-[#818BAC] text-sm flex justify-between">
                          <p>Processing fee: ${parseFloat(withdrawal.processing_fee).toFixed(2)}</p>
                          <p>Net amount: ${(parseFloat(withdrawal.amount) - parseFloat(withdrawal.processing_fee)).toFixed(2)}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedWithdrawals.map((withdrawal) => (
                      <motion.div
                        key={withdrawal.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                        className={`bg-[#1A2338]/80 backdrop-blur-sm rounded-lg p-4 hover:shadow-md transition-all duration-200 border-l-4 ${
                          withdrawal.status === 'completed' ? 'border-l-green-500' : 
                          withdrawal.status === 'pending' ? 'border-l-yellow-500' : 
                          'border-l-red-500'
                        } border border-[#3f2d63]/30`}
                      >
                        <div className="flex justify-between items-start">
                          <p className="text-white font-bold text-lg">
                            ${parseFloat(withdrawal.amount).toFixed(2)}
                          </p>
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs ${
                              withdrawal.status === 'completed'
                                ? 'bg-green-500/20 text-green-400'
                                : withdrawal.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                          </span>
                        </div>
                        
                        <p className="text-[#818BAC] text-sm mt-2 capitalize">
                          Method: {withdrawal.withdrawal_method ? withdrawal.withdrawal_method.replace('_', ' ') : 'Unknown Method'}
                        </p>
                        
                        <div className="mt-2 text-[#818BAC] text-xs">
                          <p>Fee: ${parseFloat(withdrawal.processing_fee).toFixed(2)}</p>
                          <p>Net: ${(parseFloat(withdrawal.amount) - parseFloat(withdrawal.processing_fee)).toFixed(2)}</p>
                        </div>
                        
                        <div className="mt-4 pt-2 border-t border-[#3f2d63]/20 text-xs text-[#818BAC] flex items-center">
                          <BsCalendar className="mr-1" />
                          {formatDate(withdrawal.withdrawal_date)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={handleCloseWithdrawModal}
        userId={contextUser?.user?.id || ''}
        availableBalance={statsBalance.availableBalance || 0}
        onWithdraw={handleWithdraw}
      />
    </motion.div>
  );
} 