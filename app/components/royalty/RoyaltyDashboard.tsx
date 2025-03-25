"use client";

import { BsGraphUp, BsCashStack, BsClock, BsArrowUp, BsArrowDown, BsExclamationCircle, BsCalendar, BsPiggyBank, BsWallet2 } from 'react-icons/bs';
import { format, formatDistance } from 'date-fns';
import { useRoyaltyManagement } from '@/app/hooks/useRoyaltyManagement';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import WithdrawModal from './WithdrawModal';
import { FaMoneyBillWave, FaChartLine, FaHandHoldingUsd, FaHistory, FaInfoCircle, FaCheckCircle, FaUniversity, FaPaypal, FaCreditCard, FaWaveSquare, FaVolumeUp, FaCompactDisc } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useUser } from "@/app/context/user";
import { Tooltip } from 'react-tooltip';
import TransactionStatusBadge from '../ui/TransactionStatusBadge';

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

// Updated gradient border styles with hover effect and blue tones
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
`;

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
    whileHover={{ y: -5 }}
    className={`gradient-border transition-all duration-300 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    onClick={onClick}
    data-tooltip-id={tooltip ? `tooltip-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined}
    data-tooltip-content={tooltip}
  >
    <div className="bg-[#1A2338]/60 p-6 rounded-xl h-full backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-[#3f2d63]/30 text-violet-300 text-xl">
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
        <p className="text-[#9BA3BF] text-sm">{description}</p>
      )}

      {tooltip && (
        <Tooltip id={`tooltip-${title.replace(/\s+/g, '-').toLowerCase()}`} />
      )}
    </div>
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
    <>
      <style jsx global>{gradientBorderStyles}</style>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6 px-0"
      >
        {/* Header with Title and Withdraw Button */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 md:mb-8">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center">
              <FaChartLine className="mr-2 text-violet-300" />
              Your Earnings Dashboard
            </h2>
            <p className="text-[#9BA3BF] text-sm md:text-base">Track your revenue, withdrawals and transaction history</p>
          </div>
          <div className="flex flex-wrap gap-3 mt-2 lg:mt-0">
            <motion.button
              whileHover={{ 
                scale: 1.05, 
                boxShadow: '0 0 25px 5px rgba(124, 58, 237, 0.4)',
                transition: { duration: 0.3 }
              }}
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenWithdrawModal}
              className="inline-flex items-center px-6 py-3.5 rounded-full shadow-xl transition-all duration-300 
                bg-gradient-to-r from-[#3f2d63] via-[#583d8c] to-[#4e377a] text-white border border-[#583d8c]/50 
                backdrop-blur-sm hover:shadow-[0_0_30px_rgba(124,58,237,0.5)]
                relative overflow-hidden group"
              data-tooltip-id="withdraw-tooltip"
              data-tooltip-content="Withdraw your available funds"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 
                group-hover:animate-shimmer transition-opacity duration-500"></span>
              <div className="flex items-center relative z-10">
                <FaMoneyBillWave className="text-lg mr-3 text-violet-300" />
                <span className="font-medium text-base">Withdraw Funds</span>
              </div>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={updateDashboardData}
              disabled={isRefreshingBalance}
              className="inline-flex items-center px-3 py-2.5 rounded-lg shadow-md transition-all duration-200 
                text-white hover:bg-[#3f2d63]/50 bg-[#3f2d63]/30"
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

        {/* Main Stats Grid - Changed to floating cards with more spacing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          <StatsCard
            icon={<BsCashStack size={24} />}
            title="Total Earned"
            value={`$${(statsBalance.totalEarned || 0).toFixed(2)}`}
            description="Lifetime earnings from your tracks"
            tooltip="Total amount earned from all your track sales"
            className="backdrop-blur-md"
          />
          
          <StatsCard
            icon={<BsWallet2 size={24} />}
            title="Available Balance"
            value={`$${(statsBalance.availableBalance || 0).toFixed(2)}`}
            description={isRefreshingBalance ? "Updating balance..." : `Ready to withdraw • Last updated: ${formatDistance(lastUpdateTime, new Date(), { addSuffix: true })}`} 
            className="backdrop-blur-md"
            tooltip="Amount available for withdrawal"
            onClick={handleOpenWithdrawModal}
          />
        </div>

        {/* Sales & Withdrawals History Tabs - Improved with gradient border */}
        <div className="gradient-border p-0.5 rounded-xl">
          <div className="bg-[#1A2338]/60 p-4 rounded-xl backdrop-blur-md">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-3">
              <div className="flex space-x-2 items-center">
                <button
                  onClick={() => setActiveTab('sales')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    activeTab === 'sales' 
                      ? 'bg-[#3f2d63]/70 text-white' 
                      : 'text-[#9BA3BF] hover:text-white hover:bg-[#3f2d63]/40'
                  }`}
                >
                  Sales History
                </button>
                <button
                  onClick={() => setActiveTab('withdrawals')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    activeTab === 'withdrawals' 
                      ? 'bg-[#3f2d63]/70 text-white' 
                      : 'text-[#9BA3BF] hover:text-white hover:bg-[#3f2d63]/40'
                  }`}
                >
                  Withdrawals
                </button>
              </div>
              
              {activeTab === 'sales' && (
                <div className="flex space-x-2 items-center self-end sm:self-auto mt-2 sm:mt-0">
                <button
                  onClick={() => setTableView('list')}
                    className={`p-2 rounded transition-all ${
                    tableView === 'list' 
                        ? 'bg-[#3f2d63]/70 text-white' 
                        : 'text-[#9BA3BF] hover:text-white'
                  }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setTableView('grid')}
                    className={`p-2 rounded transition-all ${
                    tableView === 'grid' 
                        ? 'bg-[#3f2d63]/70 text-white' 
                        : 'text-[#9BA3BF] hover:text-white'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
              </div>
              )}
            </div>

            {/* Sales History */}
            {activeTab === 'sales' && (
              <>
                {transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FaInfoCircle className="text-[#818BAC] text-3xl mb-4" />
                    <h3 className="text-white text-lg font-medium mb-1">No sales yet</h3>
                    <p className="text-[#818BAC] max-w-md">
                      When users purchase your tracks, your sales will appear here.
                    </p>
                  </div>
                ) : (
                  <div className={`overflow-x-auto ${tableView === 'list' ? '-mx-4 sm:mx-0 pb-4' : ''}`}>
                    {tableView === 'list' ? (
                      <div className="min-w-full">
                        <table className="min-w-full text-white">
                          <thead>
                            <tr className="border-b border-[#3f2d63]/40">
                              <th className="px-4 py-3 text-left text-xs font-medium text-[#818BAC] uppercase tracking-wider">
                                Buyer
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[#818BAC] uppercase tracking-wider">
                                Amount
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[#818BAC] uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[#818BAC] uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#3f2d63]/30">
                            {sortedTransactions.map((transaction) => (
                              <tr key={transaction.purchase_id} className="hover:bg-[#3f2d63]/10 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0 h-8 w-8 rounded-full overflow-hidden bg-[#3f2d63]/50 flex items-center justify-center">
                                      {transaction.buyer_image ? (
                                        <img 
                                          src={transaction.buyer_image} 
                                          alt={transaction.buyer_name}
                                          className="h-full w-full object-cover"
                                          onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239BA3BF'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";
                                          }}
                                        />
                                      ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#9BA3BF" className="w-5 h-5">
                                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                        </svg>
                                      )}
                                    </div>
                                    <div>
                                      <div className="text-white font-medium">
                                        {transaction.buyer_name}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  <span className="text-violet-300 font-medium">${transaction.amount}</span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-[#818BAC]">
                                  {formatDate(transaction.transaction_date)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  <TransactionStatusBadge
                                    status={transaction.status}
                                    size="sm"
                                    withAnimation={true}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedTransactions.map((transaction) => (
                          <div 
                            key={transaction.purchase_id}
                            className="gradient-border rounded-lg"
                          >
                            <div className="bg-[#1A2338]/50 backdrop-blur-md p-4 rounded-lg">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className="flex-shrink-0 h-8 w-8 rounded-full overflow-hidden bg-[#3f2d63]/50 flex items-center justify-center">
                                    {transaction.buyer_image ? (
                                      <img 
                                        src={transaction.buyer_image} 
                                        alt={transaction.buyer_name}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.onerror = null;
                                          e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239BA3BF'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";
                                        }}
                                      />
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#9BA3BF" className="w-5 h-5">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                      </svg>
                                    )}
                                  </div>
                                  <div className="text-white font-medium truncate max-w-[120px]">
                                    {transaction.buyer_name}
                                  </div>
                                </div>
                                <TransactionStatusBadge
                                  status={transaction.status}
                                  size="sm"
                                  withAnimation={true}
                                />
                              </div>
                              <div className="flex justify-between items-center my-3">
                                <span className="text-[#818BAC] text-sm">Amount:</span>
                                <span className="text-violet-300 font-medium">${transaction.amount}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[#818BAC] text-sm">Date:</span>
                                <span className="text-white text-sm">{formatDate(transaction.transaction_date)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Withdrawals History */}
            {activeTab === 'withdrawals' && (
              <>
                {withdrawalHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FaInfoCircle className="text-[#818BAC] text-3xl mb-4" />
                    <h3 className="text-white text-lg font-medium mb-1">No withdrawals yet</h3>
                    <p className="text-[#818BAC] max-w-md">
                      When you withdraw your royalties, they will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0 pb-4">
                    <div className="min-w-full">
                      <table className="min-w-full text-white">
                        <thead>
                          <tr className="border-b border-[#3f2d63]/40">
                            <th className="px-4 py-3 text-left text-xs font-medium text-[#818BAC] uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[#818BAC] uppercase tracking-wider">
                              Method
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[#818BAC] uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[#818BAC] uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#3f2d63]/30">
                          {sortedWithdrawals.map((withdrawal) => (
                            <tr key={withdrawal.id} className="hover:bg-[#3f2d63]/10 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className="text-violet-300 font-medium">${withdrawal.amount}</span>
                                {withdrawal.processing_fee && Number(withdrawal.processing_fee) > 0 && (
                                  <span className="text-xs text-[#818BAC] ml-1">
                                    (fee: ${withdrawal.processing_fee})
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                {withdrawal.withdrawal_method === 'bank_transfer' && (
                                  <span className="flex items-center">
                                    <FaUniversity className="mr-1" /> Bank Transfer
                                  </span>
                                )}
                                {withdrawal.withdrawal_method === 'paypal' && (
                                  <span className="flex items-center">
                                    <FaPaypal className="mr-1" /> PayPal
                                  </span>
                                )}
                                {withdrawal.withdrawal_method === 'card' && (
                                  <span className="flex items-center">
                                    <FaCreditCard className="mr-1" /> Card
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-[#818BAC]">
                                {formatDate(withdrawal.withdrawal_date)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <TransactionStatusBadge
                                  status={withdrawal.status}
                                  size="sm"
                                  withAnimation={true}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={handleCloseWithdrawModal}
        userId={contextUser?.user?.id || ''}
        availableBalance={statsBalance.availableBalance}
        onWithdraw={handleWithdraw}
      />
    </>
  );
} 