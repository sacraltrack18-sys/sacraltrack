"use client";

import { useState, useEffect } from 'react';
import { Models } from 'appwrite';
import { toast } from 'react-hot-toast';
import { useUser } from "@/app/context/user";
import { database, ID, Query } from '@/libs/AppWriteClient';
import useNotifications from "@/app/hooks/useNotifications";

// Добавляем логирование для отладки
console.log('Appwrite Configuration:', {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_URL,
  project: process.env.NEXT_PUBLIC_ENDPOINT,
  databaseId: process.env.NEXT_PUBLIC_DATABASE_ID,
  royaltyCollectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY,
  royaltyBalanceCollectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE,
  purchasesCollectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_PURCHASES,
  withdrawalsCollectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_WITHDRAWALS
});

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
        console.log('🔄 Checking session with context user:', contextUser?.user);
        
        if (currentUserId && !isInitialized) {
          setUserId(currentUserId);
          console.log('👤 Setting userId:', currentUserId);
          await initializeCollections();
          setIsInitialized(true);
        } else {
          console.log('❌ No user in context or already initialized');
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
        console.log('🔄 Loading data for initialized user:', userId);
        await fetchRoyaltyData();
      }
    };

    loadData();

    // Настраиваем автоматическое обновление данных о роялти каждые 2 минуты
    const dataUpdateInterval = setInterval(() => {
      if (userId && isInitialized) {
        console.log('🔄 Auto-refreshing royalty data...');
        fetchRoyaltyData(false); // Обновляем без показа индикатора загрузки
      }
    }, 120000); // 2 минуты

    return () => {
      clearInterval(dataUpdateInterval);
    };
  }, [userId, isInitialized]);

  const syncPurchasesWithRoyalty = async () => {
    if (!userId) {
      console.log('syncPurchasesWithRoyalty: No userId available');
      return;
    }

    try {
      console.log('Начинаем синхронизацию покупок с роялти для автора:', userId);
      
      // 1. Получаем все покупки со статусом pending, где автором является наш пользователь
      const purchasesResponse = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_PURCHASES!,
        [
          Query.equal('author_id', userId),
          Query.equal('status', 'pending') // Ищем только pending покупки
        ]
      );

      console.log('Найдено pending покупок для автора:', purchasesResponse.documents.length);

      // 2. Получаем существующие роялти для автора
      const royaltyResponse = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY!,
        [Query.equal('author_id', userId)]
      );

      console.log('Найдено записей роялти для автора:', royaltyResponse.documents.length);

      // Создаем Set из ID покупок, для которых уже есть роялти
      const existingRoyalties = new Set(
        royaltyResponse.documents.map((doc) => doc.purchase_id)
      );

      // 3. Находим покупки без роялти
      const newPurchases = purchasesResponse.documents.filter(
        (purchase) => !existingRoyalties.has(purchase.$id)
      );

      console.log('Найдено новых покупок для создания роялти:', newPurchases.length);

      // 4. Создаем новые записи роялти и обновляем статус покупок
      for (const purchase of newPurchases) {
          const royaltyAmount = (parseFloat(purchase.amount) * 0.5).toString();
        console.log('Создаем запись роялти для покупки:', {
          purchaseId: purchase.$id,
          amount: purchase.amount,
          royaltyAmount,
          authorId: userId,
          buyerId: purchase.user_id
        });

        // Создаем запись роялти
        await database.createDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY!,
            ID.unique(),
            {
            user_id: purchase.user_id,
            author_id: userId,
              track_id: purchase.track_id,
              amount: royaltyAmount,
              transaction_date: purchase.purchase_date,
              purchase_id: purchase.$id,
              status: 'completed',
              purchase_amount: purchase.amount,
              royalty_percentage: '50',
              currency: 'USD',
            payment_method: 'stripe'
          }
        );

        // Обновляем статус покупки на 'completed'
        await database.updateDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_PURCHASES!,
          purchase.$id,
          {
            status: 'completed'
          }
        );

        console.log('✅ Обновлен статус покупки на completed:', purchase.$id);
      }

      // 5. Обновляем баланс автора
      if (newPurchases.length > 0) {
        const balanceResponse = await database.listDocuments(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
          [Query.equal('author_id', userId)]
        );

        const newRoyaltyTotal = newPurchases.reduce((sum, purchase) => {
          return sum + (parseFloat(purchase.amount) * 0.5);
        }, 0);

        if (balanceResponse.documents.length > 0) {
          const balanceDoc = balanceResponse.documents[0];
          const currentBalance = parseFloat(balanceDoc.balance || '0');
          const currentTotalEarned = parseFloat(balanceDoc.total_earned || '0');

          await database.updateDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
            balanceDoc.$id,
            {
              balance: (currentBalance + newRoyaltyTotal).toString(),
              total_earned: (currentTotalEarned + newRoyaltyTotal).toString(),
              last_updated: new Date().toISOString()
            }
          );
        }
      }

      console.log('Синхронизация завершена успешно');

    } catch (error) {
      console.error('Ошибка при синхронизации покупок с роялти:', error);
      throw error;
    }
  };

  const fetchRoyaltyData = async (showLoading = true) => {
    if (!userId) {
      console.log('❌ No userId provided, skipping fetchRoyaltyData');
      return;
    }
    
    console.log('🔄 Starting fetchRoyaltyData for userId:', userId);
    console.log('----------------------------------------');
    
    if (showLoading) {
    setLoading(true);
    }
    setError(null);
    
    try {
      // 0. Очищаем дублирующие записи баланса
      console.log('0️⃣ Cleaning up duplicate balance records...');
      const allBalanceRecords = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
        [
          Query.equal('author_id', userId),
          Query.orderDesc('total_earned')
        ]
      );

      console.log('📊 Found balance records:', allBalanceRecords.documents.length);

      if (allBalanceRecords.documents.length > 1) {
        console.log('⚠️ Found duplicate records, cleaning up...');
        const mainRecord = allBalanceRecords.documents[0];
        console.log('✅ Keeping main record:', {
          id: mainRecord.$id,
          totalEarned: mainRecord.total_earned,
          balance: mainRecord.balance
        });

        // Удаляем все дубликаты
        for (let i = 1; i < allBalanceRecords.documents.length; i++) {
          const duplicateRecord = allBalanceRecords.documents[i];
          console.log('🗑️ Deleting duplicate record:', {
            id: duplicateRecord.$id,
            totalEarned: duplicateRecord.total_earned,
            balance: duplicateRecord.balance
          });

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

      // 1. Получаем все завершенные покупки
      console.log('1️⃣ Fetching completed and pending purchases...');
      const purchasesResponse = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_PURCHASES!,
        [
          Query.equal('author_id', userId),
          Query.equal('status', ['completed', 'pending'])
        ]
      );

      console.log('📦 Found completed and pending purchases:', {
        count: purchasesResponse.documents.length,
        purchases: purchasesResponse.documents.map(p => ({
          id: p.$id,
          amount: p.amount,
          buyer_id: p.user_id,
          track_id: p.track_id,
          date: p.purchase_date
        }))
      });

      // 2. Получаем все записи роялти
      console.log('2️⃣ Fetching royalty records where author_id =', userId);
      const royaltyResponse = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY!,
        [Query.equal('author_id', userId)]
      );

      console.log('💰 Found royalty records:', {
        count: royaltyResponse.documents.length,
        royalties: royaltyResponse.documents.map(r => ({
          id: r.$id,
          amount: r.amount,
          purchase_id: r.purchase_id,
          date: r.transaction_date
        }))
      });

      // 3. Синхронизируем покупки с роялти
      console.log('3️⃣ Starting purchase-royalty synchronization');
      await syncPurchasesWithRoyalty();

      // 4. Получаем актуальные записи роялти после синхронизации
      console.log('4️⃣ Fetching updated royalty records after sync');
      const updatedRoyaltyResponse = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY!,
        [
          Query.equal('author_id', userId),
          Query.orderDesc('transaction_date')
        ]
      );

      console.log('📊 Updated royalty records after sync:', {
        count: updatedRoyaltyResponse.documents.length,
        difference: updatedRoyaltyResponse.documents.length - royaltyResponse.documents.length
      });

      // 5. Подсчитываем общую сумму роялти
      const totalEarned = updatedRoyaltyResponse.documents.reduce((sum, doc) => {
        return sum + parseFloat(doc.amount || '0');
      }, 0);

      console.log('5️⃣ Calculated total earnings:', {
        totalEarned,
        averagePerTransaction: totalEarned / updatedRoyaltyResponse.documents.length
      });

      // 6. Получаем выводы средств
      console.log('6️⃣ Fetching withdrawals where user_id =', userId);
      const withdrawalsResponse = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_WITHDRAWALS!,
        [Query.equal('userId', userId)]
      );
      
      console.log('📊 All withdrawals:', withdrawalsResponse.documents.map(doc => ({
        id: doc.$id,
        amount: doc.amount,
        status: doc.status,
        method: doc.method || doc.withdrawal_method
      })));

      const totalWithdrawn = withdrawalsResponse.documents.reduce((sum, doc) => {
        if (doc.status === 'completed' || doc.status === 'approved') {
          console.log(`📊 Counting completed withdrawal: ${doc.$id}, amount: ${doc.amount}, status: ${doc.status}`);
          return sum + parseFloat(doc.amount || '0');
        }
        return sum;
      }, 0);

      const pendingWithdrawals = withdrawalsResponse.documents.reduce((sum, doc) => {
        if (doc.status === 'pending') {
          console.log(`📊 Counting pending withdrawal: ${doc.$id}, amount: ${doc.amount}, status: ${doc.status}`);
          return sum + parseFloat(doc.amount || '0');
        }
        return sum;
      }, 0);

      console.log('💳 Withdrawal summary:', {
        total: withdrawalsResponse.documents.length,
        completed: withdrawalsResponse.documents.filter(w => w.status === 'completed').length,
        approved: withdrawalsResponse.documents.filter(w => w.status === 'approved').length,
        pending: withdrawalsResponse.documents.filter(w => w.status === 'pending').length,
        totalWithdrawn,
        pendingWithdrawals
      });

      // 7. Получаем или создаем документ баланса
      console.log('7️⃣ Checking balance document where author_id =', userId);
      const balanceResponse = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
        [Query.equal('author_id', userId)]
      );

      let balanceDoc;
      const availableBalance = totalEarned - totalWithdrawn - pendingWithdrawals;

      console.log('💰 Balance calculation:', {
        totalEarned,
        totalWithdrawn,
        pendingWithdrawals,
        availableBalance
      });

      // Protect balance from incorrect recalculation when there are approved withdrawals
      // This ensures the withdrawals are properly accounted for
      const hasApprovedWithdrawals = withdrawalsResponse.documents.some(w => w.status === 'approved');
      
      if (balanceResponse.documents.length > 0) {
        balanceDoc = balanceResponse.documents[0];
        console.log('📝 Existing balance document:', {
          id: balanceDoc.$id,
          currentBalance: balanceDoc.balance,
          calculatedBalance: availableBalance.toString(),
          currentTotalWithdrawn: balanceDoc.total_withdrawn,
          currentPendingWithdrawals: balanceDoc.pending_withdrawals
        });
        
        if (hasApprovedWithdrawals) {
          console.log('⚠️ Found approved withdrawals, updating document carefully');
          
          // Update document with accurate withdrawal and pending information
          await database.updateDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
            balanceDoc.$id,
            {
              total_earned: totalEarned.toString(),
              total_withdrawn: totalWithdrawn.toString(),
              pending_withdrawals: pendingWithdrawals.toString(),
              balance: availableBalance.toString(),
              last_updated: new Date().toISOString()
            }
          );
          
          console.log('🛡️ Balance updated with proper accounting for approved withdrawals');
          
          // Verify update was correct
          const verifyBalanceResponse = await database.getDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
            balanceDoc.$id
          );
          
          console.log('✅ Verification of balance after update:', {
            id: verifyBalanceResponse.$id,
            balance: verifyBalanceResponse.balance,
            totalWithdrawn: verifyBalanceResponse.total_withdrawn,
            pendingWithdrawals: verifyBalanceResponse.pending_withdrawals
          });
        } else {
          console.log('📝 No approved withdrawals, updating document normally');
          
          await database.updateDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
            balanceDoc.$id,
            {
              total_earned: totalEarned.toString(),
              balance: availableBalance.toString(),
              total_withdrawn: totalWithdrawn.toString(),
              pending_withdrawals: pendingWithdrawals.toString(),
              last_updated: new Date().toISOString()
            }
          );
        }
      } else {
        console.log('📝 Creating new balance document');
        balanceDoc = await database.createDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
          ID.unique(),
          {
            author_id: userId,
            total_earned: totalEarned.toString(),
            balance: availableBalance.toString(),
            total_withdrawn: totalWithdrawn.toString(),
            pending_withdrawals: pendingWithdrawals.toString(),
            last_updated: new Date().toISOString(),
            currency: 'USD'
          }
        );
        console.log('✅ New balance document created:', balanceDoc.$id);
      }

      // 8. Обрабатываем информацию о покупателях
      console.log('8️⃣ Processing buyer information');
      const transactions = await Promise.all(
        updatedRoyaltyResponse.documents.map(async (doc) => {
          let buyerInfo = { name: '', image: '/images/placeholder-user.jpg' };
          
          try {
            if (doc.user_id) {
              console.log('🔍 Looking up buyer profile for user_id:', doc.user_id);
              const buyerId = doc.user_id.toString();
              
              try {
                const buyerProfile = await database.listDocuments(
                  process.env.NEXT_PUBLIC_DATABASE_ID!,
                  process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
                  [Query.equal('user_id', buyerId)]
                );
                
                if (buyerProfile.documents.length > 0) {
                  const profile = buyerProfile.documents[0];
                  buyerInfo = {
                    name: profile.name || profile.username || profile.displayName || 'User',
                    image: profile.image || '/images/placeholder-user.jpg'
                  };
                  console.log('👤 Found buyer profile by user_id:', buyerInfo);
              } else {
                  const alternativeProfile = await database.listDocuments(
                    process.env.NEXT_PUBLIC_DATABASE_ID!,
                    process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
                    [Query.equal('$id', buyerId)]
                  );
                  
                  if (alternativeProfile.documents.length > 0) {
                    const profile = alternativeProfile.documents[0];
                    buyerInfo = {
                      name: profile.name || profile.username || profile.displayName || 'User',
                      image: profile.image || '/images/placeholder-user.jpg'
                    };
                    console.log('👤 Found buyer profile by $id:', buyerInfo);
                  } else {
                    console.log('⚠️ No profile found for user_id:', doc.user_id);
                    
                    try {
                      const userDoc = await database.getDocument(
                        process.env.NEXT_PUBLIC_DATABASE_ID!,
                        process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
                        buyerId
                      );
                      
                      if (userDoc) {
                        buyerInfo = {
                          name: userDoc.name || userDoc.username || userDoc.displayName || 'User',
                          image: userDoc.image || '/images/placeholder-user.jpg'
                        };
                        console.log('👤 Found user document directly:', buyerInfo);
                      }
                    } catch (userError) {
                      console.error('❌ Error fetching user document:', userError);
                    }
              }
            }
          } catch (error) {
            console.error('❌ Error fetching buyer profile:', error);
              }
            } else {
              console.log('⚠️ No user_id found in the royalty record:', doc.$id);
            }
          } catch (error) {
            console.error('❌ Error processing buyer information:', error);
          }

          return {
            userId: doc.userId,
            track_id: doc.track_id,
            amount: doc.amount,
            transaction_date: doc.transaction_date,
            purchase_id: doc.purchase_id,
            status: doc.status || 'completed',
            purchase_amount: doc.purchase_amount || doc.amount,
            royalty_percentage: doc.royalty_percentage || '50',
            currency: doc.currency || 'USD',
            buyer_id: doc.user_id || 'unknown_user',
            buyer_name: buyerInfo.name || 'User',
            buyer_image: buyerInfo.image
          } as RoyaltyTransaction;
        })
      );

      console.log('9️⃣ Final transaction summary:', {
        totalTransactions: transactions.length,
        uniqueTracks: new Set(transactions.map(t => t.track_id)).size,
        uniqueBuyers: new Set(transactions.map(t => t.buyer_id)).size,
        totalAmount: transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)
      });

      // 9. Обновляем состояние компонента
      setRoyaltyData({
        balance: availableBalance,
        totalEarned: totalEarned,
        pendingAmount: pendingWithdrawals,
        withdrawnAmount: totalWithdrawn,
        transactions,
        tracksSold: new Set(transactions.map(t => t.track_id)).size,
        pendingWithdrawals: pendingWithdrawals,
        withdrawalHistory: withdrawalsResponse.documents.map(doc => ({
          id: doc.$id,
          amount: doc.amount,
          status: doc.status,
          date: doc.date || doc.createdAt,
          method: doc.method || doc.withdrawal_method,
          processing_fee: doc.processing_fee || '0',
          currency: doc.currency || 'USD',
          withdrawal_details: doc.withdrawal_details || {}
        }))
      });

      console.log('🎉 Final royalty data state:', {
        balance: availableBalance,
        totalEarned,
        pendingWithdrawals,
        totalWithdrawn,
        transactionsCount: transactions.length,
        uniqueTracksCount: new Set(transactions.map(t => t.track_id)).size
      });
      console.log('----------------------------------------');

      // Обновляем timestamp последнего обновления
      setLastUpdated(new Date());
    } catch (error) {
      console.error('❌ Error in fetchRoyaltyData:', error);
      setError('Failed to fetch royalty data. Please try again later.');
    } finally {
      if (showLoading) {
      setLoading(false);
      }
    }
  };

  // Функция для проверки возможности вывода
  const validateWithdrawal = (amount: number, withdrawalMethod: string, details: WithdrawalDetails) => {
    console.log('🔍 Validating withdrawal request:', { amount, withdrawalMethod });
    
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than 0');
    }
    
    // Removed minimum balance check for testing purposes
    
    if (!withdrawalMethod) {
      throw new Error('Please select a withdrawal method');
    }
    
    // Method-specific validations
    switch (withdrawalMethod) {
      case 'bank_transfer':
        if (!details.bank_transfer) {
          throw new Error('Bank transfer details are required');
        }
        if (!details.bank_transfer.bank_name) {
          throw new Error('Bank name is required');
        }
        if (!details.bank_transfer.account_number) {
          throw new Error('Account number is required');
        }
        if (!details.bank_transfer.account_holder) {
          throw new Error('Account holder name is required');
        }
        break;
      case 'paypal':
        if (!details.paypal || !details.paypal.email) {
          throw new Error('PayPal email is required');
        }
        break;
      case 'card':
      case 'visa_card':
        if (!details.visa_card) {
          throw new Error('Card details are required');
        }
        if (!details.visa_card.card_number) {
          throw new Error('Card number is required');
        }
        if (!details.visa_card.expiry_date) {
          throw new Error('Expiry date is required');
        }
        if (!details.visa_card.cvv) {
          throw new Error('CVV is required');
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
        throw new Error('Invalid withdrawal method');
    }
    
    return true;
  };

  // Обновляем функцию createWithdrawalNotification
  const createWithdrawalNotification = async (
    status: 'pending' | 'completed' | 'failed',
    amount: string,
    method: string,
    message: string
  ) => {
    if (!userId) return;

    try {
      await createNotification(userId, 'withdrawal', {
        amount: amount,
        message: message
      });

      // Update local state for immediate UI feedback
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

  // Обновляем функцию requestWithdrawal для более точного обновления баланса
  const requestWithdrawal = async (
    amount: number,
    withdrawalMethod: string,
    details: WithdrawalDetails
  ) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      console.log('🔄 Processing withdrawal request:', {
        amount,
        method: withdrawalMethod,
        userId
      });

      // 1. Валидация
      validateWithdrawal(amount, withdrawalMethod, details);

      // 2. Проверяем баланс
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

      // 3. Создаем запись о выводе средств
      console.log('2️⃣ Creating withdrawal record...');
      const withdrawalId = ID.unique();
      const withdrawalDate = new Date().toISOString();
      
      console.log('Creating withdrawal with data:', {
        userId,
        amount: amount.toString(),
        withdrawalMethod,
        withdrawalDate,
        processingFee: (amount * 0.03).toFixed(2),
        details: typeof details === 'string' ? details : JSON.stringify(details)
      });
      
      try {
      const withdrawalDoc = await database.createDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_WITHDRAWALS!,
        withdrawalId,
        {
          userId: userId,
          amount: amount.toString(),
          status: 'pending',
          method: withdrawalMethod,
          bankDetails: withdrawalMethod === 'bank_transfer' ? JSON.stringify(details.bank_transfer) : null,
          paypalEmail: withdrawalMethod === 'paypal' ? details.paypal?.email : null,
          createdAt: new Date(),
          updatedAt: new Date().toISOString(),
          withdrawal_details: typeof details === 'string' ? details : JSON.stringify(details)
        }
      );

        console.log('✅ Created withdrawal record:', withdrawalDoc.$id);
      } catch (error) {
        console.error('❌ Error creating withdrawal document:', error);
        throw new Error(`Failed to create withdrawal: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // 4. Создаем запись в истории выводов с правильной структурой
      try {
        const withdrawalHistoryDoc = await database.createDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          '67d3ed53003db77d14cf', // WITHDRAWAL_HISTORY collection
          ID.unique(),
          {
            userId: userId,
            withdrawals: withdrawalId,
            amount: amount.toString(),
            method: withdrawalMethod,
            status: 'pending',
            processedAt: new Date().toISOString(),
            details: typeof details === 'string' ? details : JSON.stringify(details),
            date: new Date().toISOString()
          }
        );

        console.log('✅ Created withdrawal history record:', withdrawalHistoryDoc.$id);
      } catch (error) {
        console.error('❌ Error creating withdrawal history record:', error);
        // Продолжаем выполнение даже в случае ошибки, чтобы не блокировать основной процесс
      }

      // 5. Обновляем баланс
      console.log('3️⃣ Updating balance...');
      // Получаем текущее значение pending_withdrawals или устанавливаем 0, если оно отсутствует
      const currentPendingWithdrawals = parseFloat(balanceDoc.documents[0].pending_withdrawals || '0');
      
      // Увеличиваем pending_withdrawals на сумму нового вывода
      const newPendingWithdrawals = currentPendingWithdrawals + amount;
      
      // Вычисляем новый доступный баланс, вычитая сумму вывода
      const newAvailableBalance = currentBalance - amount;
      
      console.log('📊 Balance update calculation:', {
        currentBalance, 
        currentPendingWithdrawals,
        newPendingWithdrawals,
        newAvailableBalance,
        withdrawalAmount: amount
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

      console.log('✅ Balance updated. New values:', {
        balance: newAvailableBalance,
        pending_withdrawals: newPendingWithdrawals
      });

      // 6. Создаем уведомление
      console.log('4️⃣ Creating notification...');
      await createWithdrawalNotification(
        'pending',
        amount.toString(),
        withdrawalMethod,
        `Your withdrawal request for $${amount.toFixed(2)} via ${withdrawalMethod} has been submitted and is being processed.`
      );

      // 7. Запускаем процесс проверки статуса
      console.log('5️⃣ Starting status check...');
      startWithdrawalStatusCheck(withdrawalId);

      // 8. Немедленно обновляем интерфейс, добавляя запись в историю выводов и обновляя баланс
      console.log('6️⃣ Updating UI...');
      setRoyaltyData(prev => ({
        ...prev,
        balance: newAvailableBalance, // Обновляем доступный баланс
        pendingWithdrawals: newPendingWithdrawals, // Обновляем сумму ожидающих выводов
        pendingAmount: newPendingWithdrawals, // Обновляем pendingAmount для совместимости
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

      // 9. Обновляем данные после короткой задержки, чтобы дать базе данных время на обновление
      console.log('7️⃣ Scheduling data refresh...');
      setTimeout(() => {
        // Выполняем полное обновление данных, включая новый вывод
        fetchRoyaltyData(true);
        console.log('✅ Delayed data refresh completed');
      }, 1500);

      console.log('✅ Withdrawal request completed successfully');

      notifyWithdrawalRequest(amount.toString(), withdrawalMethod, details);

      // Обновляем timestamp последнего обновления
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

  // Обновляем функцию startWithdrawalStatusCheck
  const startWithdrawalStatusCheck = async (withdrawalId: string) => {
    const checkStatus = async () => {
      try {
        const withdrawal = await database.getDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          '67d3f02300165c008416', // WITHDRAWALS collection
          withdrawalId
        );

        if (withdrawal.status === 'completed' || withdrawal.status === 'approved') {
          console.log(`✅ Withdrawal ${withdrawalId} status is ${withdrawal.status}`);
          
          // Находим существующую запись в истории выводов
          const historyResponse = await database.listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            '67d3ed53003db77d14cf', // WITHDRAWAL_HISTORY collection
            [Query.equal('withdrawals', withdrawalId)]
          );
          
          // Обновляем или создаем запись в истории выводов
          if (historyResponse.documents.length > 0) {
            // Обновляем существующую запись
            console.log(`🔄 Updating existing history record for withdrawal ${withdrawalId}`);
            await database.updateDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              '67d3ed53003db77d14cf', // WITHDRAWAL_HISTORY collection
              historyResponse.documents[0].$id,
              {
                status: 'completed',
                processedAt: new Date().toISOString()
              }
            );
          } else {
            // Создаем новую запись
            console.log(`📝 Creating new history record for completed withdrawal ${withdrawalId}`);
            await database.createDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              '67d3ed53003db77d14cf', // WITHDRAWAL_HISTORY collection
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
          
          // CRITICAL: Don't call fetchRoyaltyData for completed/approved withdrawals
          // as it will recalculate the balance incorrectly
          console.log('🛡️ Skipping fetchRoyaltyData to protect balance for approved withdrawal');
          
          // Just update the UI state
          setRoyaltyData(prev => ({
            ...prev,
            withdrawalHistory: prev.withdrawalHistory.map(item => 
              item.id === withdrawalId 
                ? {...item, status: 'completed', processedAt: new Date().toISOString()} 
                : item
            )
          }));
          
          // Обновляем timestamp последнего обновления
          setLastUpdated(new Date());
          
          return;
        }

        if (withdrawal.status === 'failed' || withdrawal.status === 'rejected') {
          console.log(`❌ Withdrawal ${withdrawalId} status is ${withdrawal.status}`);
          
          // Находим существующую запись в истории выводов
          const historyResponse = await database.listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            '67d3ed53003db77d14cf', // WITHDRAWAL_HISTORY collection
            [Query.equal('withdrawals', withdrawalId)]
          );
          
          // Обновляем или создаем запись в истории выводов
          if (historyResponse.documents.length > 0) {
            // Обновляем существующую запись
            console.log(`🔄 Updating existing history record for failed withdrawal ${withdrawalId}`);
            await database.updateDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              '67d3ed53003db77d14cf', // WITHDRAWAL_HISTORY collection
              historyResponse.documents[0].$id,
              {
                status: 'failed',
                processedAt: new Date().toISOString()
              }
            );
          } else {
            // Создаем новую запись
            console.log(`📝 Creating new history record for failed withdrawal ${withdrawalId}`);
            await database.createDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              '67d3ed53003db77d14cf', // WITHDRAWAL_HISTORY collection
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
          
          // For failed withdrawals, we do need to update the balance
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

          // Here fetchRoyaltyData is fine because we want to refresh
          // after returning funds to balance for rejected withdrawals
          console.log('🔄 Refreshing royalty data after failed withdrawal');
          await fetchRoyaltyData();
          
          // Обновляем timestamp последнего обновления
          setLastUpdated(new Date());
          
          return;
        }

        // If it's still pending, we'll check again after a delay
        setTimeout(checkStatus, 30000); // Check every 30 seconds
      } catch (error) {
        console.error('❌ Error checking withdrawal status:', error);
      }
    };
    
    // Start checking immediately
    checkStatus();
  };

  const refreshRoyaltyData = () => {
    return fetchRoyaltyData();
  };

  const initializeCollections = async () => {
    if (!userId) {
      console.log('initializeCollections: Нет userId');
      return;
    }

    try {
      console.log('🔄 Инициализация коллекций для пользователя:', userId);
      
      // 1. Проверяем существование коллекций
      try {
        await database.listDocuments(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
          []
        );
        console.log('✅ Коллекция баланса роялти существует');
      } catch (error) {
        console.error('❌ Ошибка при проверке коллекции баланса:', error);
        throw new Error('Коллекция баланса роялти не найдена');
      }

      // 2. Получаем все записи баланса для пользователя
      console.log('🔍 Проверяем записи баланса для пользователя:', userId);
      const balanceResponse = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
        [
          Query.equal('author_id', userId),
          Query.orderDesc('total_earned') // Сортируем по убыванию total_earned
        ]
      );

      console.log('📊 Найдено записей баланса:', balanceResponse.documents.length);

      if (balanceResponse.documents.length > 1) {
        console.log('⚠️ Обнаружены дублирующие записи. Выполняем очистку...');
        
        // Оставляем запись с наибольшим total_earned
        const mainRecord = balanceResponse.documents[0];
        console.log('✅ Основная запись:', {
          id: mainRecord.$id,
          totalEarned: mainRecord.total_earned,
          balance: mainRecord.balance
        });

        // Удаляем все остальные записи
        for (let i = 1; i < balanceResponse.documents.length; i++) {
          const duplicateRecord = balanceResponse.documents[i];
          console.log('🗑️ Удаляем дублирующую запись:', {
            id: duplicateRecord.$id,
            totalEarned: duplicateRecord.total_earned,
            balance: duplicateRecord.balance
          });
          
          try {
            await database.deleteDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
              duplicateRecord.$id
            );
          } catch (error) {
            console.error('❌ Ошибка при удалении дублирующей записи:', error);
          }
        }
      }

      // 3. Создаем новую запись, если нет ни одной
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
          console.log('✅ Создана новая запись баланса:', newBalanceDoc.$id);
        } catch (error) {
          console.error('❌ Ошибка при создании записи баланса:', error);
          throw new Error('Не удалось создать запись баланса');
        }
      }

      // 4. Синхронизируем существующие покупки с роялти
      console.log('🔄 Синхронизация покупок с роялти...');
      await syncPurchasesWithRoyalty();

      // 5. Обновляем данные
      console.log('🔄 Обновление данных...');
      await fetchRoyaltyData();

      console.log('✅ Инициализация завершена успешно');

      } catch (error) {
      console.error('❌ Ошибка при инициализации коллекций:', error);
      setError('Не удалось инициализировать коллекции. Пожалуйста, попробуйте позже.');
      throw error;
      }
    };

  const getRoyaltyBalance = async (authorId: string): Promise<RoyaltyBalance> => {
    try {
      console.log('🔄 Getting royalty balance for authorId:', authorId);
      
      if (!authorId) {
        console.log('❌ No authorId provided');
        throw new Error('Author ID is required');
      }

      // Сначала пробуем получить баланс из записи в базе данных
      console.log('1️⃣ Trying to fetch balance document directly...');
      const balanceResponse = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
        [Query.equal('author_id', authorId)]
      );

      // Если нашли запись баланса, используем её значения
      if (balanceResponse.documents.length > 0) {
        const balanceDoc = balanceResponse.documents[0];
        console.log('✅ Found balance document:', {
          id: balanceDoc.$id,
          balance: balanceDoc.balance,
          totalEarned: balanceDoc.total_earned
        });

        const totalEarned = parseFloat(balanceDoc.total_earned || '0');
        const availableBalance = parseFloat(balanceDoc.balance || '0');

        console.log('💰 Directly using balance from document:', {
          totalEarned,
          availableBalance
        });

        // Обновляем состояние компонента с новыми данными о балансе
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

      // Если запись баланса не найдена, рассчитываем баланс на основе транзакций
      console.log('⚠️ No balance document found, calculating from transactions...');

      // 1. Получаем все завершенные записи роялти для автора
      console.log('2️⃣ Fetching completed royalty records...');
      const royaltyResponse = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY!,
        [
          Query.equal('author_id', authorId),
          Query.equal('status', 'completed')
        ]
      );

      // Подсчитываем общую сумму роялти только из завершенных транзакций
      const totalEarned = royaltyResponse.documents.reduce((sum, royalty) => {
        return sum + parseFloat(royalty.amount || '0');
      }, 0);

      console.log('💵 Calculated total earned from completed royalties:', totalEarned);

      // 2. Получаем завершенные и ожидающие выводы средств автора
      console.log('3️⃣ Fetching withdrawals...');
      const withdrawals = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_WITHDRAWALS!,
        [Query.equal('userId', authorId)]
      );

      const completedWithdrawals = withdrawals.documents.reduce(
        (sum, withdrawal) => {
          if (withdrawal.status === 'completed' || withdrawal.status === 'approved') {
            console.log(`Including completed withdrawal: ${withdrawal.$id}, amount: ${withdrawal.amount}`);
            return sum + parseFloat(withdrawal.amount || '0');
          }
          return sum;
        },
        0
      );

      const pendingWithdrawals = withdrawals.documents.reduce(
        (sum, withdrawal) => {
          if (withdrawal.status === 'pending') {
            console.log(`Including pending withdrawal: ${withdrawal.$id}, amount: ${withdrawal.amount}`);
            return sum + parseFloat(withdrawal.amount || '0');
        }
        return sum;
        },
        0
      );

      // 3. Вычисляем доступный баланс
      const availableBalance = Math.max(0, totalEarned - completedWithdrawals - pendingWithdrawals);

      console.log('💰 Balance calculation:', {
        totalEarned,
        completedWithdrawals,
        pendingWithdrawals,
        availableBalance
      });

      // 4. Создаем или обновляем запись баланса
      if (balanceResponse.documents.length === 0) {
        console.log('📝 Creating new balance document');
        await database.createDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
          ID.unique(),
          {
            author_id: authorId,
            total_earned: totalEarned.toString(),
            balance: availableBalance.toString(),
            total_withdrawn: completedWithdrawals.toString(),
            pending_withdrawals: pendingWithdrawals.toString(),
            last_updated: new Date().toISOString(),
            currency: 'USD'
          }
        );
      } else {
        const balanceDoc = balanceResponse.documents[0];
        console.log('📝 Updating balance document:', {
          id: balanceDoc.$id,
          oldBalance: balanceDoc.balance,
          newBalance: availableBalance.toString()
        });

        await database.updateDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
          balanceDoc.$id,
          {
            total_earned: totalEarned.toString(),
            balance: availableBalance.toString(),
            total_withdrawn: completedWithdrawals.toString(),
            pending_withdrawals: pendingWithdrawals.toString(),
            last_updated: new Date().toISOString()
          }
        );
      }

      console.log('✅ Balance calculation completed:', {
        totalEarned,
        availableBalance
      });

      // Обновляем состояние компонента с новыми данными о балансе
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
      console.log('No userId available for force refresh');
      return;
    }
    
    console.log('Force refreshing royalty data...');
    setLoading(true);
    
    try {
      await syncPurchasesWithRoyalty();
      await fetchRoyaltyData();
      console.log('Force refresh completed');
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