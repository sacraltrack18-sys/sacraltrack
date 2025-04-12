"use client";

import { useState, useEffect } from 'react';
import { database, ID, Query } from '@/libs/AppWriteClient';
import { Models } from 'appwrite';
import { toast } from 'react-hot-toast';
import useNotifications from '@/app/hooks/useNotifications';

export interface WithdrawalRequest extends Models.Document {
  userId: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  method: 'bank_transfer' | 'paypal' | 'card' | 'crypto';
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    holderName: string;
  } | string;
  cardDetails?: {
    card_number?: string;
    cardNumber?: string;
    expiry_date?: string;
    expiry?: string;
    card_holder?: string;
    holderName?: string;
    cvv?: string;
  } | string;
  paypalEmail?: string;
  cryptoAddress?: string;
  cryptoNetwork?: string;
  createdAt: string;
  withdrawal_method?: string;
  withdrawal_details?: any;
}

export const useWithdrawalManagement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { createNotification } = useNotifications();
  
  // Define collection IDs
  const PAID_ROYALTIES_COLLECTION_ID = "67d7f678002842422663";

  useEffect(() => {
    // We'll handle collection initialization on the server side
    // since client-side SDK doesn't have collection management capabilities
  }, []);

  const getWithdrawalRequests = async (): Promise<WithdrawalRequest[]> => {
    try {
      setIsLoading(true);
      const response = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_WITHDRAWALS!,
        []
      );
      return response.documents as WithdrawalRequest[];
    } catch (error) {
      console.error('Failed to fetch withdrawal requests:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для обновления интерфейса пользователя после обработки вывода
  const refreshUserInterface = async (userId: string) => {
    try {
      // Отправляем событие для обновления UI в реальном времени
      const customEvent = new CustomEvent('withdrawal-processed', { 
        detail: { userId, timestamp: new Date().toISOString() } 
      });
      window.dispatchEvent(customEvent);
      
      console.log('✅ Sent withdrawal-processed event for UI update');
    } catch (error) {
      console.error('❌ Failed to refresh UI after withdrawal processing:', error);
    }
  };

  const processWithdrawal = async (withdrawalId: string, status: 'approved' | 'rejected', userId: string) => {
    try {
      setIsLoading(true);
      console.log(`🔄 Processing withdrawal ${withdrawalId} with status: ${status}`);

      // Get the withdrawal details first
      const withdrawal = await database.getDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_WITHDRAWALS!,
        withdrawalId
      ) as WithdrawalRequest;

      console.log('📋 Retrieved withdrawal details:', withdrawal);

      // Update withdrawal status
      await database.updateDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_WITHDRAWALS!,
        withdrawalId,
        {
          status,
          updatedAt: new Date().toISOString(),
          withdrawal_details: typeof withdrawal.withdrawal_details === 'string' 
            ? withdrawal.withdrawal_details 
            : JSON.stringify(withdrawal.withdrawal_details || {}),
          method: withdrawal.method || withdrawal.withdrawal_method,
          amount: withdrawal.amount,
          userId: withdrawal.userId,
          createdAt: withdrawal.createdAt || new Date(),
          bankDetails: withdrawal.bankDetails || null,
          paypalEmail: withdrawal.paypalEmail || null
        }
      );
      
      console.log(`✅ Updated withdrawal status to: ${status}`);

      // Handle balance update - only return funds to balance if rejected
      if (status === 'rejected') {
        console.log('⚠️ Processing REJECTED withdrawal - will return funds to user balance');
        
        // Get current balance
        const balanceResponse = await database.listDocuments(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
          [Query.equal('author_id', userId)]
        );

        if (balanceResponse.documents.length > 0) {
          const balanceDoc = balanceResponse.documents[0];
          const currentBalance = parseFloat(balanceDoc.balance || '0');
          const currentPendingWithdrawals = parseFloat(balanceDoc.pending_withdrawals || '0');

          console.log('💰 Current balance details:', {
            balance: currentBalance,
            pending_withdrawals: currentPendingWithdrawals
          });

          // Return the amount to available balance
          await database.updateDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
            balanceDoc.$id,
            {
              balance: (currentBalance + withdrawal.amount).toString(),
              pending_withdrawals: Math.max(0, currentPendingWithdrawals - withdrawal.amount).toString(),
              last_updated: new Date().toISOString()
            }
          );
          
          console.log(`✅ Funds (${withdrawal.amount}) returned to user balance for rejected withdrawal`);
          
          // Verify the balance was updated correctly
          const updatedBalanceDoc = await database.getDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
            balanceDoc.$id
          );
          
          console.log('📊 Balance after update:', {
            newBalance: updatedBalanceDoc.balance,
            newPendingWithdrawals: updatedBalanceDoc.pending_withdrawals,
            expectedBalance: (currentBalance + withdrawal.amount).toString(),
            expectedPendingWithdrawals: Math.max(0, currentPendingWithdrawals - withdrawal.amount).toString()
          });
        }

        // Create withdrawal history record
        await database.createDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_WITHDRAWAL_HISTORY!,
          ID.unique(),
          {
            userId: userId,
            withdrawalId: withdrawalId,
            amount: withdrawal.amount.toString(),
            method: withdrawal.method,
            status: 'rejected',
            processedAt: new Date().toISOString(),
            details: typeof withdrawal.bankDetails === 'string' 
              ? withdrawal.bankDetails 
              : JSON.stringify(withdrawal.bankDetails),
            withdrawal_date: new Date().toISOString(), // Add withdrawal date for UI display
            withdrawal_method: withdrawal.method, // Add method for UI display
            processing_fee: '0', // Add processing fee for UI display
            currency: 'USD' // Add currency for UI display
          }
        );

        // Send notification to user
        await createNotification(
          userId,
          {
            type: 'withdrawal',
            title: 'Withdrawal Request Rejected',
            message: `Your withdrawal request for $${withdrawal.amount} has been rejected. The funds have been returned to your available balance. Please try again or contact support if you need assistance.`,
            amount: withdrawal.amount.toString()
          }
        );

        // For rejected withdrawals, add to payment_cards collection
        try {
          const bankDetails = typeof withdrawal.bankDetails === 'string' 
            ? JSON.parse(withdrawal.bankDetails) 
            : withdrawal.bankDetails;

          console.log('Creating payment_cards document for rejected withdrawal with details:', {
            user_id: userId,
            date: new Date().toISOString(),
            card: bankDetails?.accountNumber || '',
            card_name: bankDetails?.bankName || '',
            card_date: new Date().toISOString(),
            amount: withdrawal.amount.toString(),
            paid: "false",
            author_id: userId,
            status: 'rejected',
            withdrawal_date: new Date().toISOString(),
            method: withdrawal.method,
            transaction_id: '',
            currency: 'USD'
          });

          await database.createDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_PAYMENT_CARDS!,
            ID.unique(),
            {
              user_id: userId,
              date: new Date().toISOString(),
              card: bankDetails?.accountNumber || '',
              card_name: bankDetails?.bankName || '',
              card_date: new Date().toISOString(),
              amount: withdrawal.amount.toString(),
              paid: "false",
              author_id: userId,
              status: 'rejected',
              withdrawal_date: new Date().toISOString(),
              method: withdrawal.method,
              transaction_id: '',
              currency: 'USD'
            }
          );
          console.log('Successfully created payment_cards document for rejected withdrawal');
        } catch (error) {
          console.error('Failed to create payment card for rejected withdrawal:', error);
        }

        toast.success('Withdrawal rejected and funds returned to user balance');
        
        // Обновляем интерфейс пользователя после обработки вывода
        await refreshUserInterface(userId);
      } else if (status === 'approved') {
        console.log('✅ Processing APPROVED withdrawal - NO funds will be returned to user balance');
        
        // Get the withdrawal details
        const withdrawal = await database.getDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_WITHDRAWALS!,
          withdrawalId
        ) as WithdrawalRequest;

        // For approved withdrawals, we should update the pending_withdrawals amount
        // but NOT return the amount to the available balance
        try {
          console.log('🔍 Looking for balance document with author_id:', userId);
          
          const balanceResponse = await database.listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
            [Query.equal('author_id', userId)]
          );

          console.log(`📋 Found ${balanceResponse.documents.length} balance documents for author_id:`, userId);
          
          if (balanceResponse.documents.length > 0) {
            const balanceDoc = balanceResponse.documents[0];
            console.log('💰 Current balance document:', {
              id: balanceDoc.$id,
              author_id: balanceDoc.author_id,
              balance: balanceDoc.balance,
              pending_withdrawals: balanceDoc.pending_withdrawals,
              total_withdrawn: balanceDoc.total_withdrawn || '0'
            });
            
            const currentPendingWithdrawals = parseFloat(balanceDoc.pending_withdrawals || '0');
            const currentBalance = parseFloat(balanceDoc.balance || '0');
            const currentTotalWithdrawn = parseFloat(balanceDoc.total_withdrawn || '0');

            // IMPORTANT: Only update pending_withdrawals, not the balance
            // Also update total_withdrawn to properly track this approved withdrawal
            const updateData = {
              pending_withdrawals: Math.max(0, currentPendingWithdrawals - withdrawal.amount).toString(),
              total_withdrawn: (currentTotalWithdrawn + withdrawal.amount).toString(),
              last_updated: new Date().toISOString()
              // Explicitly NOT updating balance here - balance should remain unchanged
            };
            
            console.log('📝 Updating balance document with data:', updateData);
            
            // Only update pending_withdrawals and total_withdrawn, NOT the available balance
            await database.updateDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
              balanceDoc.$id,
              updateData
            );
            
            console.log(`✅ Updated document: reduced pending_withdrawals by ${withdrawal.amount} and increased total_withdrawn by ${withdrawal.amount}`);
            console.log(`ℹ️ Balance should remain ${currentBalance} (unchanged)`);
            
            // Verify balance was not changed
            const verifyBalanceResponse = await database.getDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
              balanceDoc.$id
            );
            
            console.log('📊 Balance after update:', {
              id: verifyBalanceResponse.$id,
              author_id: verifyBalanceResponse.author_id,
              balance: verifyBalanceResponse.balance,
              pending_withdrawals: verifyBalanceResponse.pending_withdrawals,
              total_withdrawn: verifyBalanceResponse.total_withdrawn
            });
            
            // Ensure balance didn't accidentally change
            if (parseFloat(verifyBalanceResponse.balance) !== currentBalance) {
              console.error('⚠️ WARNING: Balance changed unexpectedly! Was:', currentBalance, 'Now:', verifyBalanceResponse.balance);
            } else {
              console.log('✅ Verification successful: balance remained unchanged');
            }
          }
        } catch (error) {
          console.error('❌ Failed to update balance for approved withdrawal:', error);
        }

        // Log the raw bank details to debug
        console.log('🏦 Raw bank details:', withdrawal.bankDetails);
        
        // Parse bank details properly regardless of format
        let parsedBankDetails;
        if (withdrawal.method === 'bank_transfer') {
          try {
            if (typeof withdrawal.bankDetails === 'string') {
              // Try to parse if it's a string
              try {
                parsedBankDetails = JSON.parse(withdrawal.bankDetails);
                console.log('🏦 Parsed bank details from string:', parsedBankDetails);
              } catch (e) {
                console.error('❌ Failed to parse bank details string:', e);
                // If parsing fails, use the string as is
                parsedBankDetails = { 
                  bankName: 'Unknown Bank',
                  accountNumber: 'Unknown Account',
                  holderName: 'Unknown Holder' 
                };
              }
            } else {
              // Use object directly
              parsedBankDetails = withdrawal.bankDetails;
              console.log('🏦 Using bank details as object:', parsedBankDetails);
            }
          } catch (e) {
            console.error('❌ Error handling bank details:', e);
            parsedBankDetails = { 
              bankName: 'Unknown Bank',
              accountNumber: 'Unknown Account',
              holderName: 'Unknown Holder' 
            };
          }
        }
        
        // Format withdrawal details as JSON string with proper error handling
        const withdrawalDetails = JSON.stringify({
          bank_transfer: withdrawal.method === 'bank_transfer' ? {
            bank_name: parsedBankDetails?.bankName || '',
            account_number: parsedBankDetails?.accountNumber || '',
            holder_name: parsedBankDetails?.holderName || ''
          } : null,
          paypal: withdrawal.method === 'paypal' ? {
            email: withdrawal.paypalEmail || ''
          } : null
        });

        console.log('📋 Formatted withdrawal details for database:', withdrawalDetails);

        // Validate that we're using only fields that exist in the Paid_Royalties schema
        // These should match exactly with the collection schema
        const paidRoyaltiesData = {
          user_id: userId,
          payment_date: new Date().toISOString(),
          amount: withdrawal.amount.toString(),
          status: 'approved',
          method: withdrawal.method,
          original_request_id: withdrawalId,
          currency: 'USD',
          processing_fee: '0',  // Default to 0 if no processing fee
          manager_id: 'system', // You may want to pass the actual manager ID here
          withdrawal_details: withdrawalDetails,
          paid: 'paid', // Add paid status
          withdrawal_date: new Date().toISOString(), // Add withdrawal date
          transaction_id: '', // Add empty transaction ID
          // Add proper permissions for the document
          $permissions: {
            read: [`user:${userId}`, "role:member", "role:admin"], // Allow user and admin roles to read
            write: ["role:admin"]  // Only admins can write
          }
        };

        console.log('Creating Paid_Royalties document for approved withdrawal with details:', paidRoyaltiesData);

        // For approved withdrawals, add to Paid_Royalties collection
        try {
          const paidRoyaltyDoc = await database.createDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            PAID_ROYALTIES_COLLECTION_ID, // Paid_Royalties collection ID
            ID.unique(),
            paidRoyaltiesData
          );
          console.log('Successfully created Paid_Royalties document for approved withdrawal:', paidRoyaltyDoc.$id);

          // Create withdrawal history record with improved details handling
          await database.createDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_WITHDRAWAL_HISTORY!,
            ID.unique(),
            {
              userId: userId,
              withdrawalId: withdrawalId,
              amount: withdrawal.amount.toString(),
              method: withdrawal.method,
              status: 'approved',
              processedAt: new Date().toISOString(),
              details: withdrawalDetails, // Use the same properly formatted details
              withdrawal_date: new Date().toISOString(), // Add withdrawal date for UI display
              withdrawal_method: withdrawal.method, // Add method for UI display
              processing_fee: '0', // Add processing fee for UI display
              currency: 'USD', // Add currency for UI display
              // Add proper permissions for the history document as well
              $permissions: {
                read: [`user:${userId}`, "role:member", "role:admin"],
                write: ["role:admin"] 
              }
            }
          );

          // Send notification to user
          await createNotification(
            userId,
            {
              type: 'withdrawal',
              title: 'Withdrawal Request Approved',
              message: `Your withdrawal request for $${withdrawal.amount} has been approved and is being processed.`,
              amount: withdrawal.amount.toString()
            }
          );

          toast.success('Withdrawal approved successfully');
          
          // Обновляем интерфейс пользователя после обработки вывода
          await refreshUserInterface(userId);
        } catch (error) {
          console.error('Failed to create Paid_Royalties document:', error);
          
          // Detailed error logging for debugging
          if ((error as any)?.message) {
            console.error('Error details:', {
              message: (error as any).message,
              code: (error as any).code,
              type: (error as any).type,
              data: paidRoyaltiesData
            });
          }
          
          if ((error as any)?.code === 404) {
            console.error('Collection does not exist. Please check your collection IDs.');
            toast.error('Failed to process withdrawal. Please contact the administrator.');
          } else if ((error as any)?.message?.includes('Invalid document structure')) {
            console.error('Invalid document structure error:', (error as any)?.message);
            toast.error('Failed to process withdrawal due to document structure mismatch. Please contact the administrator.');
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to process withdrawal:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const createPaymentCard = async (withdrawalData: any) => {
    try {
      const paymentCard = await database.createDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'payment_cards',
        ID.unique(),
        {
          user_id: withdrawalData.user_id,
          date: new Date().toISOString(),
          card: withdrawalData.card,
          card_name: withdrawalData.card_name,
          card_date: withdrawalData.card_date,
          amount: withdrawalData.amount,
          paid: 'false',
          author_id: withdrawalData.author_id,
          status: 'pending',
          withdrawal_date: withdrawalData.withdrawal_date || new Date().toISOString(),
          method: withdrawalData.method || 'card',
          transaction_id: '',
          currency: withdrawalData.currency || 'USD'
        }
      );
      toast.success('Payment card created successfully');
      return paymentCard;
    } catch (error: any) {
      console.error('Error creating payment card:', error);
      if (error.code === 404) {
        toast.error('Payment cards collection does not exist. Please initialize it first.');
      } else {
        toast.error('Failed to create payment card');
      }
      throw error;
    }
  };

  return {
    getWithdrawalRequests,
    processWithdrawal,
    createPaymentCard,
    isLoading
  };
}; 