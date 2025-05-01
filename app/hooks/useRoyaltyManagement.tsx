"use client";

import { useState, useEffect } from 'react';
import { Models } from 'appwrite';
import { toast } from 'react-hot-toast';
import { useUser } from "@/app/context/user";
import { database, ID, Query } from '@/libs/AppWriteClient';
import { useNotifications } from "@/app/hooks/useNotifications";

interface RoyaltyTransaction {
  userId: string;
  track_id: string;
  amount: string;
  transaction_date: string;
  purchase_id: string;
  status: string;
  purchase_amount: string;
  royalty_percentage: string;
  currency: string;
  buyer_id: string;
  buyer_name: string;
  buyer_image: string;
}

interface RoyaltyWithdrawal {
  id: string;
  userId: string;
  amount: string;
  status: string;
  withdrawal_date: string;
  transaction_id?: string;
  withdrawal_method: string;
  currency: string;
}

interface RoyaltyBalanceDocument extends Models.Document {
  total_earned: string;
  available_balance: string;
  balance: string;
  userId: string;
  last_updated: string;
  currency: string;
  pending_withdrawals: string;
  total_withdrawn: string;
}

interface RoyaltyBalance {
  totalEarned: number;
  availableBalance: number;
}

interface WithdrawalRecord {
  id: string;
  amount: string;
  status: string;
  date: string;
  method: string;
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
}

interface RoyaltyData {
  balance: number;
  totalEarned: number;
  pendingAmount: number;
  transactions: RoyaltyTransaction[];
  tracksSold: number;
  withdrawnAmount: number;
  pendingWithdrawals: number;
  withdrawalHistory: WithdrawalRecord[];
}

interface WithdrawalDetails {
  bank_transfer?: {
    bank_name: string;
    account_number: string;
    account_holder: string;
  };
  visa_card?: {
    card_number: string;
    expiry_date: string;
    cvv: string;
    card_holder: string;
  };
  crypto?: {
    wallet_address: string;
    network: string;
  };
  paypal?: {
    email: string;
  };
}

interface PurchaseDocument extends Models.Document {
  userId: string;
  buyer_id: string;
  track_id: string;
  amount: string;
  purchase_date: string;
  status: string;
  $id: string;
}

interface WithdrawalNotification {
  type: 'withdrawal';
  status: 'pending' | 'completed' | 'failed';
  amount: string;
  method: string;
  date: string;
  message: string;
}

interface WithdrawalDocument extends Models.Document {
  status: 'pending' | 'approved' | 'rejected';
  amount: string;
  userId: string;
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
}

export const useRoyaltyManagement = () => {
  const contextUser = useUser();
  const { createNotification } = useNotifications();
  const [royaltyData, setRoyaltyData] = useState<RoyaltyData>({
    balance: 0,
    totalEarned: 0,
    pendingAmount: 0,
    withdrawnAmount: 0,
    transactions: [],
    tracksSold: 0,
    pendingWithdrawals: 0,
    withdrawalHistory: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<WithdrawalNotification[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentUserId = contextUser?.user?.id;
        
        if (currentUserId && !isInitialized) {
          setUserId(currentUserId);
          await initializeCollections();
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('❌ Session check failed:', error);
      }
    };

    checkSession();
  }, [contextUser?.user, isInitialized]);

  useEffect(() => {
    const loadData = async () => {
      if (userId && isInitialized) {
        await fetchRoyaltyData();
      }
    };

    loadData();

    const dataUpdateInterval = setInterval(() => {
      if (userId && isInitialized) {
        fetchRoyaltyData(false);
      }
    }, 120000);

    return () => {
      clearInterval(dataUpdateInterval);
    };
  }, [userId, isInitialized]);

  const syncPurchasesWithRoyalty = async () => {
    if (!userId) {
      return;
    }

    try {
      const purchasesResponse = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_PURCHASES!,
        [
          Query.equal('author_id', userId),
          Query.equal('status', 'pending')
        ]
      );

      const royaltyResponse = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY!,
        [
          Query.equal('userId', userId)
        ]
      );

      const existingPurchaseIds = royaltyResponse.documents.map(doc => doc.purchase_id);
      const newPurchases = purchasesResponse.documents.filter(
        purchase => !existingPurchaseIds.includes(purchase.$id)
      );

      const royaltyCreationPromises = newPurchases.map(async (purchase) => {
        const purchaseAmount = parseFloat(purchase.amount);
        const royaltyAmount = (purchaseAmount * 0.8).toFixed(2);

        return database.createDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY!,
          ID.unique(),
          {
            userId: userId,
            track_id: purchase.track_id,
            amount: royaltyAmount,
            transaction_date: purchase.purchase_date,
            purchase_id: purchase.$id,
            status: 'available',
            purchase_amount: purchase.amount,
            royalty_percentage: '80',
            currency: 'USD',
            buyer_id: purchase.buyer_id,
            buyer_name: purchase.buyer_name || 'Unknown',
            buyer_image: purchase.buyer_image || ''
          }
        );
      });

      if (royaltyCreationPromises.length > 0) {
        await Promise.all(royaltyCreationPromises);
      }

      const purchaseUpdatePromises = newPurchases.map(purchase => 
        database.updateDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_PURCHASES!,
          purchase.$id,
          {
            status: 'processed'
          }
        )
      );

      if (purchaseUpdatePromises.length > 0) {
        await Promise.all(purchaseUpdatePromises);
      }

      return royaltyResponse.documents.length + newPurchases.length;
    } catch (error) {
      console.error('Error synchronizing purchases with royalty:', error);
      return 0;
    }
  };

  const fetchRoyaltyData = async (showLoading = true) => {
    if (!userId) return;
    
    if (showLoading) {
      setLoading(true);
    }
    
    try {
      const royaltyCount = await syncPurchasesWithRoyalty();
      
      const royaltyResponse = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY!,
        [
          Query.equal('userId', userId),
          Query.orderDesc('transaction_date')
        ]
      );
      
      let totalEarned = 0;
      let availableBalance = 0;
      let pendingAmount = 0;
      
      royaltyResponse.documents.forEach(doc => {
        const amount = parseFloat(doc.amount);
        totalEarned += amount;
        
        if (doc.status === 'available') {
          availableBalance += amount;
        } else if (doc.status === 'pending') {
          pendingAmount += amount;
        }
      });
      
      const withdrawalsResponse = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_WITHDRAWALS!,
        [
          Query.equal('userId', userId),
          Query.orderDesc('withdrawal_date')
        ]
      );
      
      let withdrawnAmount = 0;
      let pendingWithdrawals = 0;
      
      withdrawalsResponse.documents.forEach(doc => {
        const amount = parseFloat(doc.amount);
        if (doc.status === 'approved') {
          withdrawnAmount += amount;
        } else if (doc.status === 'pending') {
          pendingWithdrawals += amount;
        }
      });
      
      const withdrawalHistory = withdrawalsResponse.documents.map(doc => ({
        id: doc.$id,
        amount: doc.amount,
        status: doc.status,
        date: doc.withdrawal_date,
        method: doc.withdrawal_method,
        processing_fee: doc.processing_fee || '0',
        currency: doc.currency || 'USD',
        withdrawal_details: doc.withdrawal_details || {}
      }));
      
      const balanceAfterWithdrawals = availableBalance - pendingWithdrawals;
      
      let balanceDocument;
      try {
        const balanceResponse = await database.listDocuments(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
          [Query.equal('userId', userId)]
        );
        
        if (balanceResponse.documents.length > 0) {
          balanceDocument = balanceResponse.documents[0];
          
          const approvedWithdrawals = withdrawalsResponse.documents.filter(
            doc => doc.status === 'approved' && doc.withdrawal_date > balanceDocument.last_updated
          );
          
          if (approvedWithdrawals.length > 0) {
            await database.updateDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
              balanceDocument.$id,
              {
                available_balance: balanceAfterWithdrawals.toFixed(2),
                total_earned: totalEarned.toFixed(2),
                pending_withdrawals: pendingWithdrawals.toFixed(2),
                total_withdrawn: withdrawnAmount.toFixed(2),
                last_updated: new Date().toISOString()
              }
            );
          } else {
            await database.updateDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
              balanceDocument.$id,
              {
                available_balance: balanceAfterWithdrawals.toFixed(2),
                total_earned: totalEarned.toFixed(2),
                pending_withdrawals: pendingWithdrawals.toFixed(2),
                total_withdrawn: withdrawnAmount.toFixed(2),
                last_updated: new Date().toISOString()
              }
            );
          }
        } else {
          balanceDocument = await database.createDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
            ID.unique(),
            {
              userId: userId,
              available_balance: balanceAfterWithdrawals.toFixed(2),
              total_earned: totalEarned.toFixed(2),
              pending_withdrawals: pendingWithdrawals.toFixed(2),
              total_withdrawn: withdrawnAmount.toFixed(2),
              currency: 'USD',
              last_updated: new Date().toISOString()
            }
          );
        }
      } catch (error) {
        console.error('Error updating royalty balance:', error);
      }
      
      const transactionSummary = {
        balance: balanceAfterWithdrawals,
        totalEarned: totalEarned,
        pendingAmount: pendingAmount,
        withdrawnAmount: withdrawnAmount,
        transactions: royaltyResponse.documents.map(doc => ({
          userId: doc.userId,
          track_id: doc.track_id,
          amount: doc.amount,
          transaction_date: doc.transaction_date,
          purchase_id: doc.purchase_id,
          status: doc.status || 'available',
          purchase_amount: doc.purchase_amount || doc.amount,
          royalty_percentage: doc.royalty_percentage || '80',
          currency: doc.currency || 'USD',
          buyer_id: doc.buyer_id || 'unknown_user',
          buyer_name: doc.buyer_name || 'User',
          buyer_image: doc.buyer_image || '/images/placeholder-user.jpg'
        })) as RoyaltyTransaction[],
        tracksSold: royaltyResponse.documents.length,
        pendingWithdrawals: pendingWithdrawals,
        withdrawalHistory: withdrawalHistory
      };
      
      setRoyaltyData(transactionSummary);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Error fetching royalty data:', error);
      setError('Failed to fetch royalty data');
    } finally {
      setLoading(false);
    }
  };

  const validateWithdrawal = (amount: number, withdrawalMethod: string, details: WithdrawalDetails) => {
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than 0');
    }
    
    if (amount < 1) {
      throw new Error('Minimum withdrawal amount is $1.00');
    }
    
    if (!withdrawalMethod) {
      throw new Error('Please select a withdrawal method');
    }
    
    switch (withdrawalMethod) {
      case 'bank_transfer':
        if (!details.bank_transfer) {
          throw new Error('Bank transfer details are required');
        }
        if (!details.bank_transfer.bank_name) {
          throw new Error('Bank name is required for bank transfers');
        }
        if (!details.bank_transfer.account_number) {
          throw new Error('Account number is required for bank transfers');
        }
        if (!details.bank_transfer.account_holder) {
          throw new Error('Account holder name is required for bank transfers');
        }
        break;
        
      case 'paypal':
        if (!details.paypal || !details.paypal.email) {
          throw new Error('PayPal email is required');
        }
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(details.paypal.email)) {
          throw new Error('Please enter a valid PayPal email address');
        }
        break;
        
      case 'card':
      case 'visa_card':
        if (!details.visa_card) {
          throw new Error('Card details are required');
        }
        
        const cardNumber = details.visa_card.card_number?.replace(/\s/g, '');
        if (!cardNumber) {
          throw new Error('Card number is required');
        }
        if (!/^\d{16}$/.test(cardNumber)) {
          throw new Error('Card number must contain 16 digits');
        }
        
        if (!details.visa_card.expiry_date) {
          throw new Error('Expiry date is required');
        }
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(details.visa_card.expiry_date)) {
          throw new Error('Expiry date must be in MM/YY format');
        }
        
        const [month, year] = details.visa_card.expiry_date.split('/');
        const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
        const currentDate = new Date();
        if (expiryDate < currentDate) {
          throw new Error('The card has expired');
        }
        
        if (!details.visa_card.cvv) {
          throw new Error('CVV is required');
        }
        if (!/^\d{3,4}$/.test(details.visa_card.cvv)) {
          throw new Error('CVV must be 3 or 4 digits');
        }
        
        if (!details.visa_card.card_holder) {
          throw new Error('Cardholder name is required');
        }
        if (details.visa_card.card_holder.length < 3) {
          throw new Error('Please enter the full name as shown on the card');
        }
        
        break;
        
      case 'crypto':
        if (!details.crypto) {
          throw new Error('Cryptocurrency details are required');
        }
        if (!details.crypto.wallet_address) {
          throw new Error('Wallet address is required');
        }
        if (!details.crypto.network) {
          throw new Error('Cryptocurrency network is required');
        }
        break;
        
      default:
        throw new Error(`Invalid withdrawal method: ${withdrawalMethod}`);
    }
  };

  const createWithdrawalNotification = async (
    status: 'pending' | 'completed' | 'failed',
    amount: string,
    method: string,
    message: string
  ) => {
    if (!userId) return;

    try {
      await createNotification(userId, 'withdrawal', {
        title: `Withdrawal ${status}`,
        message: message,
        amount: amount
      });

      const notification: WithdrawalNotification = {
        type: 'withdrawal',
        status,
        amount,
        method,
        date: new Date().toISOString(),
        message
      };
      setNotifications(prev => [notification, ...prev]);
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  };

  const notifyWithdrawalRequest = (amount: string, method: string, details: WithdrawalDetails) => {
    createWithdrawalNotification('pending', amount, method, `Вы запросили вывод на сумму ${amount} с использованием метода ${method}`);
  };

  const requestWithdrawal = async (
    amount: number,
    withdrawalMethod: string,
    details: WithdrawalDetails
  ) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      validateWithdrawal(amount, withdrawalMethod, details);

      console.log('1️⃣ Checking balance...');
      const balanceDoc = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
        [Query.equal('author_id', userId)]
      );

      if (balanceDoc.documents.length === 0) {
        console.log('❌ Balance record not found');
        throw new Error('Balance record not found');
      }
      
      const currentBalance = parseFloat(balanceDoc.documents[0].balance || '0');
      console.log('📊 Current balance:', currentBalance);

      if (currentBalance < amount) {
        console.log('❌ Insufficient balance:', { currentBalance, requestedAmount: amount });
        throw new Error('Insufficient balance');
      }

      console.log('2️⃣ Creating withdrawal record...');
      const withdrawalId = ID.unique();
      const withdrawalDate = new Date().toISOString();
      
      let formattedDetails = {};
      
      switch (withdrawalMethod) {
        case 'card':
          formattedDetails = {
            visa_card: details.visa_card || {}
          };
          break;
        case 'paypal':
          formattedDetails = {
            paypal: details.paypal || {}
          };
          break;
        case 'bank_transfer':
          formattedDetails = {
            bank_transfer: details.bank_transfer || {}
          };
          break;
        default:
          formattedDetails = details;
      }
      
      console.log('Creating withdrawal with data:', {
        userId,
        amount: amount.toString(),
        withdrawalMethod,
        withdrawalDate,
        processingFee: (amount * 0.03).toFixed(2),
        details: JSON.stringify(formattedDetails)
      });
      
      const withdrawalDoc = await database.createDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_WITHDRAWALS!,
        withdrawalId,
        {
          userId: userId,
          amount: amount.toString(),
          status: 'pending',
          withdrawal_method: withdrawalMethod,
          method: withdrawalMethod,
          bankDetails: withdrawalMethod === 'bank_transfer' ? JSON.stringify(details.bank_transfer) : null,
          paypalEmail: withdrawalMethod === 'paypal' ? details.paypal?.email : null,
          cardDetails: withdrawalMethod === 'card' ? JSON.stringify(details.visa_card) : null,
          createdAt: new Date().toISOString()
        }
      );

      console.log('✅ Withdrawal document created:', withdrawalDoc.$id);

      console.log('3️⃣ Updating user balance...');
      const pendingWithdrawals = parseFloat(balanceDoc.documents[0].pending_withdrawals || '0');
      const newAvailableBalance = currentBalance - amount;
      const newPendingWithdrawals = pendingWithdrawals + amount;
      
      console.log('Balance update calculations:', {
        currentBalance, 
        pendingWithdrawals,
        amount,
        newAvailableBalance,
        newPendingWithdrawals
      });
      
      await database.updateDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
        balanceDoc.documents[0].$id,
        {
          balance: newAvailableBalance.toString(),
          pending_withdrawals: newPendingWithdrawals.toString(),
          last_updated: withdrawalDate
        }
      );

      console.log('✅ Balance updated successfully. New values:', {
        balance: newAvailableBalance,
        pending_withdrawals: newPendingWithdrawals
      });

      console.log('4️⃣ Creating notification...');
      await createWithdrawalNotification(
        'pending',
        amount.toString(),
        withdrawalMethod,
        `Your withdrawal request of $${amount.toFixed(2)} is being processed.`
      );

      console.log('5️⃣ Starting status check...');
      startWithdrawalStatusCheck(withdrawalId);

      console.log('6️⃣ Updating UI...');
      setRoyaltyData(prev => ({
        ...prev,
        balance: newAvailableBalance,
        pendingWithdrawals: newPendingWithdrawals,
        pendingAmount: newPendingWithdrawals,
        withdrawalHistory: [
          {
            id: withdrawalId,
            amount: amount.toString(),
            status: 'pending',
            date: withdrawalDate,
            method: withdrawalMethod,
            processing_fee: (amount * 0.03).toFixed(2),
            currency: 'USD',
            withdrawal_details: details
          },
          ...(prev.withdrawalHistory || []),
        ]
      }));

      console.log('7️⃣ Scheduling data refresh...');
      setTimeout(() => {
        fetchRoyaltyData(true);
        console.log('✅ Delayed data refresh completed');
      }, 1500);

      console.log('✅ Withdrawal request completed successfully');

      notifyWithdrawalRequest(amount.toString(), withdrawalMethod, details);

      setLastUpdated(new Date());
      
      return {
        success: true,
        withdrawalId,
        amount,
        method: withdrawalMethod
      };
    } catch (error) {
      console.error('❌ Error processing withdrawal:', error);
      await createWithdrawalNotification(
        'failed',
        amount.toString(),
        withdrawalMethod,
        `Withdrawal request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  };

  const startWithdrawalStatusCheck = async (withdrawalId: string) => {
    const checkStatus = async () => {
      try {
        const withdrawal = await database.getDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          '67d3f02300165c008416',
          withdrawalId
        );

        if (withdrawal.status === 'completed' || withdrawal.status === 'approved') {
          console.log(`✅ Withdrawal ${withdrawalId} status is ${withdrawal.status}`);
          
          const historyResponse = await database.listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            '67d3ed53003db77d14cf',
            [Query.equal('withdrawals', withdrawalId)]
          );
          
          if (historyResponse.documents.length > 0) {
            await database.updateDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              '67d3ed53003db77d14cf',
              historyResponse.documents[0].$id,
              {
                status: 'completed',
                processedAt: new Date().toISOString()
              }
            );
          } else {
            await database.createDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              '67d3ed53003db77d14cf',
              ID.unique(),
              {
                userId: userId,
                withdrawals: withdrawalId,
                amount: withdrawal.amount,
                method: withdrawal.method || withdrawal.withdrawal_method,
                status: 'completed',
                processedAt: new Date().toISOString(),
                details: typeof withdrawal.withdrawal_details === 'string' ? withdrawal.withdrawal_details : JSON.stringify(withdrawal.withdrawal_details),
                date: new Date().toISOString()
              }
            );
          }

          await createWithdrawalNotification(
            'completed',
            withdrawal.amount,
            withdrawal.method || withdrawal.withdrawal_method,
            `Your withdrawal of $${parseFloat(withdrawal.amount).toFixed(2)} has been completed!`
          );
          
          console.log('🛡️ Skipping fetchRoyaltyData to protect balance for approved withdrawal');
          
          setRoyaltyData(prev => ({
            ...prev,
            withdrawalHistory: prev.withdrawalHistory.map(item => 
              item.id === withdrawalId 
                ? {...item, status: 'completed', processedAt: new Date().toISOString()} 
                : item
            )
          }));
          
          setLastUpdated(new Date());
          
          return;
        }

        if (withdrawal.status === 'failed' || withdrawal.status === 'rejected') {
          console.log(`❌ Withdrawal ${withdrawalId} status is ${withdrawal.status}`);
          
          const historyResponse = await database.listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            '67d3ed53003db77d14cf',
            [Query.equal('withdrawals', withdrawalId)]
          );
          
          if (historyResponse.documents.length > 0) {
            await database.updateDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              '67d3ed53003db77d14cf',
              historyResponse.documents[0].$id,
              {
                status: 'failed',
                processedAt: new Date().toISOString()
              }
            );
          } else {
            await database.createDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              '67d3ed53003db77d14cf',
              ID.unique(),
              {
                userId: userId,
                withdrawals: withdrawalId,
                amount: withdrawal.amount,
                method: withdrawal.method || withdrawal.withdrawal_method,
                status: 'failed',
                processedAt: new Date().toISOString(),
                details: typeof withdrawal.withdrawal_details === 'string' ? withdrawal.withdrawal_details : JSON.stringify(withdrawal.withdrawal_details),
                date: new Date().toISOString()
              }
            );
          }
          
          if (userId) {
          const balanceDoc = await database.listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
            [Query.equal('author_id', userId)]
          );

          if (balanceDoc.documents.length > 0) {
            const currentBalance = parseFloat(balanceDoc.documents[0].balance || '0');
            const pendingWithdrawals = parseFloat(balanceDoc.documents[0].pending_withdrawals || '0');
            const amount = parseFloat(withdrawal.amount);

            await database.updateDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
              balanceDoc.documents[0].$id,
              {
                balance: (currentBalance + amount).toString(),
                pending_withdrawals: Math.max(0, pendingWithdrawals - amount).toString(),
                last_updated: new Date().toISOString()
              }
            );
          }
          } else {
            console.error('❌ Cannot update balance: userId is null');
          }

          await createWithdrawalNotification(
            'failed',
            withdrawal.amount,
            withdrawal.method || withdrawal.withdrawal_method,
            `Your withdrawal request of $${parseFloat(withdrawal.amount).toFixed(2)} has failed. The funds have been returned to your balance.`
          );

          console.log('🔄 Refreshing royalty data after failed withdrawal');
          await fetchRoyaltyData();
          
          setLastUpdated(new Date());
          
          return;
        }

        setTimeout(checkStatus, 30000);
      } catch (error) {
        console.error('❌ Error checking withdrawal status:', error);
      }
    };
    
    checkStatus();
  };

  const refreshRoyaltyData = () => {
    return fetchRoyaltyData();
  };

  const initializeCollections = async () => {
    if (!userId) {
      return;
    }

    try {
      await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
        []
      );

      const balanceResponse = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
        [
          Query.equal('author_id', userId),
          Query.orderDesc('total_earned')
        ]
      );

      if (balanceResponse.documents.length > 1) {
        const mainRecord = balanceResponse.documents[0];
        
        for (let i = 1; i < balanceResponse.documents.length; i++) {
          const duplicateRecord = balanceResponse.documents[i];
          
          try {
            await database.deleteDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
              duplicateRecord.$id
            );
          } catch (error) {
            console.error('❌ Error deleting duplicate record:', error);
          }
        }
      }

      if (balanceResponse.documents.length === 0) {
        console.log('📝 Создаем новую запись баланса');
        try {
          const newBalanceDoc = await database.createDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
          ID.unique(),
          {
            author_id: userId,
              balance: '0',
            total_earned: '0',
            last_updated: new Date().toISOString(),
            currency: 'USD',
            pending_withdrawals: '0',
            total_withdrawn: '0'
            }
          );
        } catch (error) {
          console.error('❌ Ошибка при создании записи баланса:', error);
          throw new Error('Не удалось создать запись баланса');
        }
      }

      await syncPurchasesWithRoyalty();
      await fetchRoyaltyData();

    } catch (error) {
      console.error('❌ Ошибка при инициализации коллекций:', error);
      setError('Не удалось инициализировать коллекции. Пожалуйста, попробуйте позже.');
      throw error;
    }
  };

  const getRoyaltyBalance = async (authorId: string): Promise<RoyaltyBalance> => {
    try {
      if (!authorId) {
        throw new Error('Author ID is required');
      }

      const balanceResponse = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
        [Query.equal('author_id', authorId)]
      );

      if (balanceResponse.documents.length > 0) {
        const balanceDoc = balanceResponse.documents[0];
        const totalEarned = parseFloat(balanceDoc.total_earned || '0');
        const availableBalance = parseFloat(balanceDoc.balance || '0');

        setRoyaltyData(prev => ({
          ...prev,
          balance: availableBalance,
          totalEarned: totalEarned
        }));

        return {
          totalEarned,
          availableBalance
        };
      }

      const royaltyResponse = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY!,
        [
          Query.equal('author_id', authorId),
          Query.equal('status', 'completed')
        ]
      );

      const totalEarned = royaltyResponse.documents.reduce((sum, royalty) => {
        return sum + parseFloat(royalty.amount || '0');
      }, 0);

      const completedWithdrawals = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_WITHDRAWALS!,
        [Query.equal('userId', authorId)]
      ).then(withdrawals => {
        return withdrawals.documents.reduce((sum, withdrawal) => {
          if (withdrawal.status === 'completed' || withdrawal.status === 'approved') {
            return sum + parseFloat(withdrawal.amount || '0');
          }
          return sum;
        }, 0);
      });

      const pendingWithdrawals = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_WITHDRAWALS!,
        [Query.equal('userId', authorId)]
      ).then(withdrawals => {
        return withdrawals.documents.reduce((sum, withdrawal) => {
          if (withdrawal.status === 'pending') {
            return sum + parseFloat(withdrawal.amount || '0');
          }
          return sum;
        }, 0);
      });

      const availableBalance = Math.max(0, totalEarned - completedWithdrawals - pendingWithdrawals);

      setRoyaltyData(prev => ({
        ...prev,
        balance: availableBalance,
        totalEarned: totalEarned
      }));

      return {
        totalEarned,
        availableBalance
      };
    } catch (error: any) {
      console.error('❌ Failed to get royalty balance:', error);
      throw error;
    }
  };

  const forceRefresh = async () => {
    if (!userId) {
      return;
    }
    
    setLoading(true);
    
    try {
      await syncPurchasesWithRoyalty();
      await fetchRoyaltyData();
    } catch (error) {
      console.error('Force refresh failed:', error);
      setError('Failed to refresh data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getLastUpdated = () => {
    return lastUpdated;
  };

  return {
    royaltyData,
    loading,
    isLoading,
    error,
    notifications,
    refreshRoyaltyData,
    requestWithdrawal,
    getRoyaltyBalance,
    forceRefresh,
    getLastUpdated,
    lastUpdated
  };
}; 