"use client";

import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { FaHistory, FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

interface WithdrawalHistoryProps {
  withdrawals: Array<{
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

// Format dates consistently
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy • h:mm a');
  } catch (error) {
    console.error('Date formatting error:', error);
    return dateString;
  }
};

export default function WithdrawalHistory({ withdrawals }: WithdrawalHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    console.log('Opening withdrawal history modal');
    setIsOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <FaCheckCircle className="text-green-500 text-xl" />;
      case 'pending':
        return <FaClock className="text-yellow-500 text-xl" />;
      case 'failed':
        return <FaTimesCircle className="text-red-500 text-xl" />;
      default:
        return null;
    }
  };

  const getMethodDetails = (withdrawal: WithdrawalHistoryProps['withdrawals'][0]) => {
    const { withdrawal_details, withdrawal_method } = withdrawal;
    
    switch (withdrawal_method) {
      case 'bank_transfer':
        return withdrawal_details.bank_transfer 
          ? `Bank: ${withdrawal_details.bank_transfer.bank_name} (${withdrawal_details.bank_transfer.account_number.slice(-4)})`
          : 'Bank Transfer';
      case 'visa_card':
        return withdrawal_details.visa_card
          ? `Card: ****${withdrawal_details.visa_card.card_number.slice(-4)}`
          : 'Visa Card';
      case 'crypto':
        return withdrawal_details.crypto
          ? `${withdrawal_details.crypto.network}: ${withdrawal_details.crypto.wallet_address.slice(0, 6)}...${withdrawal_details.crypto.wallet_address.slice(-4)}`
          : 'Cryptocurrency';
      default:
        return 'Unknown method';
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleOpen}
        className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-purple-600/90 to-indigo-600/90 backdrop-blur-sm text-white rounded-lg shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 space-x-2"
      >
        <FaHistory className="text-lg" />
        <span>Withdrawal History</span>
      </motion.button>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-lg" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gradient-to-br from-[#272B43]/90 to-[#1e2235]/90 backdrop-blur-md p-6 shadow-xl transition-all border border-[#3f2d63]/70">
                  <Dialog.Title className="text-2xl font-bold mb-6 text-white flex items-center">
                    <FaHistory className="mr-2 text-[#20DDBB]" />
                    Withdrawal History
                  </Dialog.Title>

                  <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                    {withdrawals.length === 0 ? (
                      <div className="text-center py-8 bg-[#1A2338]/60 backdrop-blur-sm rounded-lg">
                        <FaHistory className="text-[#20DDBB]/30 text-5xl mx-auto mb-4" />
                        <p className="text-gray-300 text-lg">
                          No withdrawal history yet
                        </p>
                        <p className="text-gray-400 mt-2 text-sm">
                          Your withdrawal requests will appear here
                        </p>
                      </div>
                    ) : (
                      withdrawals.map((withdrawal) => (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={withdrawal.id}
                          className={`bg-[#1A2338]/80 backdrop-blur-sm rounded-lg p-4 transition-all hover:shadow-md border-l-4 ${
                            withdrawal.status === 'completed' ? 'border-l-green-500' : 
                            withdrawal.status === 'pending' ? 'border-l-yellow-500' : 
                            'border-l-red-500'
                          } border border-[#3f2d63]/30`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              {getStatusIcon(withdrawal.status)}
                              <span className="font-semibold text-white">
                                ${parseFloat(withdrawal.amount).toFixed(2)} {withdrawal.currency}
                              </span>
                            </div>
                            <span className="text-sm text-[#818BAC]">
                              {formatDate(withdrawal.withdrawal_date)}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-300 mt-3">
                            <p className="capitalize">{withdrawal.withdrawal_method.replace(/_/g, ' ')}</p>
                            <p className="mt-1 text-[#818BAC]">
                              {getMethodDetails(withdrawal)}
                            </p>
                          </div>
                          
                          <div className="mt-3 flex justify-between text-sm">
                            <div className="text-[#818BAC]">
                              <p>Processing fee: ${parseFloat(withdrawal.processing_fee).toFixed(2)}</p>
                              <p>Net amount: ${(parseFloat(withdrawal.amount) - parseFloat(withdrawal.processing_fee)).toFixed(2)}</p>
                            </div>
                            
                            <span className={`self-end inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${withdrawal.status === 'completed' ? 'bg-green-500/20 text-green-400' : ''}
                              ${withdrawal.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                              ${withdrawal.status === 'failed' ? 'bg-red-500/20 text-red-400' : ''}
                            `}>
                              {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                            </span>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsOpen(false)}
                      className="px-5 py-2.5 bg-[#1A2338]/70 backdrop-blur-sm text-white rounded-lg border border-[#3f2d63]/70 hover:bg-[#1A2338] transition-colors"
                    >
                      Close
                    </motion.button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
} 