"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { FaUniversity, FaPaypal, FaCreditCard, FaBitcoin, FaQuestionCircle, FaInfoCircle, FaMoneyBillWave } from 'react-icons/fa';
import { Tooltip } from 'react-tooltip';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  availableBalance: number;
  onWithdraw: (amount: number, method: string, details: any) => Promise<void>;
}

interface WithdrawalDetails {
  bankName: string;
  accountNumber: string;
  holderName: string;
  email: string;
  cardNumber: string;
  cardExpiry: string;
  cardCVV: string;
  walletAddress: string;
  network: string;
}

const withdrawalMethods = [
  {
    id: 'bank_transfer' as const,
    name: 'Bank',
    icon: <FaUniversity className="w-5 h-5" />,
    tooltip: "Transfer funds directly to your bank account"
  },
  {
    id: 'paypal' as const,
    name: 'PayPal',
    icon: <FaPaypal className="w-5 h-5" />,
    tooltip: "Fast withdrawal to your PayPal account"
  },
  {
    id: 'card' as const,
    name: 'Card',
    icon: <FaCreditCard className="w-5 h-5" />,
    tooltip: "Withdraw funds to your credit/debit card"
  },
  {
    id: 'crypto' as const,
    name: 'Crypto',
    icon: <FaBitcoin className="w-5 h-5" />,
    tooltip: "Withdraw to your cryptocurrency wallet"
  },
] as const;

type WithdrawalMethod = typeof withdrawalMethods[number]['id'];

// Animation variants
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const modalVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: 'spring', damping: 25, stiffness: 500 }
  },
  exit: { 
    opacity: 0, 
    y: 50, 
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

const staggeredFormVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const formItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function WithdrawModal({
  isOpen,
  onClose,
  userId,
  availableBalance,
  onWithdraw
}: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<WithdrawalMethod>('bank_transfer');
  const [details, setDetails] = useState<WithdrawalDetails>({
    bankName: '',
    accountNumber: '',
    holderName: '',
    email: '',
    cardNumber: '',
    cardExpiry: '',
    cardCVV: '',
    walletAddress: '',
    network: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [operationCompleted, setOperationCompleted] = useState(false);

  // Улучшаем отслеживание баланса
  useEffect(() => {
    if (isOpen) {  // Проверяем баланс только когда модальное окно открыто
      console.log('WithdrawModal получил баланс:', {
        availableBalance,
        type: typeof availableBalance,
        isNull: availableBalance === null,
        isUndefined: availableBalance === undefined,
        isNaN: isNaN(Number(availableBalance))
      });
      // Сбрасываем флаг завершения операции при каждом открытии
      setOperationCompleted(false);
    }
  }, [availableBalance, isOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    
    // Убираем проверку на минимальную сумму
    if (!value || Number(value) <= 0) {
      setAmountError('Please enter a valid amount');
    } else {
      setAmountError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Безопасно обрабатываем значение баланса
    const safeBalance = availableBalance !== undefined && availableBalance !== null 
      ? availableBalance 
      : 0;

    if (!amount || Number(amount) <= 0) {
      setAmountError('Please enter a valid amount');
      return;
    }

    if (Number(amount) > safeBalance) {
      setAmountError('Insufficient balance');
      return;
    }

    try {
      setIsSubmitting(true);
      let withdrawalDetails;

      switch (method) {
        case 'bank_transfer':
          withdrawalDetails = {
            bank_transfer: {
              bank_name: details.bankName,
              account_number: details.accountNumber,
              account_holder: details.holderName
            }
          };
          break;
        case 'paypal':
          withdrawalDetails = {
            paypal: {
              email: details.email
            }
          };
          break;
        case 'card':
          withdrawalDetails = {
            card: {
              number: details.cardNumber.replace(/\s/g, ''),
              expiry: details.cardExpiry,
              cvv: details.cardCVV,
              holder_name: details.holderName
            }
          };
          break;
        case 'crypto':
          withdrawalDetails = {
            crypto: {
              wallet_address: details.walletAddress,
              network: details.network
            }
          };
          break;
      }

      await onWithdraw(Number(amount), method, withdrawalDetails);
      
      // Устанавливаем флаг успешного завершения операции
      setOperationCompleted(true);
      
      toast.success('Withdrawal request submitted successfully', {
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
      
      // Закрываем модальное окно после успешного вывода средств
      handleCloseModal();
    } catch (error) {
      console.error('Withdrawal request failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process withdrawal');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Process fee calculator (estimate)
  const calculateProcessingFee = (amount: number) => {
    // Убираем комиссию, возвращаем 0
    return "0.00";
  };

  // Сбрасываем состояние при закрытии модального окна
  const handleCloseModal = () => {
    setAmount('');
    setAmountError('');
    setDetails({
      bankName: '',
      accountNumber: '',
      holderName: '',
      email: '',
      cardNumber: '',
      cardExpiry: '',
      cardCVV: '',
      walletAddress: '',
      network: ''
    });
    
    // Вызываем родительский обработчик закрытия окна
    onClose();
  };

  if (!isOpen) return null;

  const calculatedFee = amount ? calculateProcessingFee(Number(amount)) : "0.00";
  const netAmount = amount ? (Number(amount) - Number(calculatedFee)).toFixed(2) : "0.00";
  // Гарантируем, что баланс всегда будет числом
  const safeAvailableBalance = availableBalance !== undefined && availableBalance !== null 
    ? availableBalance 
    : 0;

  console.log('WithdrawModal рендеринг с балансом:', {
    rawBalance: availableBalance,
    safeBalance: safeAvailableBalance,
    formattedBalance: safeAvailableBalance.toFixed(2)
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/30 backdrop-blur-lg flex items-center justify-center z-50 p-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={handleCloseModal}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-gradient-to-br from-[#272B43]/90 to-[#1e2235]/90 backdrop-blur-md rounded-xl p-8 w-full max-w-md shadow-2xl border border-[#3f2d63]/70"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <FaMoneyBillWave className="text-[#20DDBB]" />
                Withdraw Royalties
              </h2>
              <button 
                onClick={handleCloseModal}
                className="text-[#818BAC] hover:text-white transition-colors p-2 hover:bg-[#3f2d63]/30 rounded-full"
              >
                ✕
              </button>
            </div>
            
            <motion.form 
              onSubmit={handleSubmit} 
              className="space-y-8"
              variants={staggeredFormVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div className="relative" variants={formItemVariants}>
                <label className="block text-sm text-[#818BAC] mb-2 flex items-center">
                  Amount
                  <FaInfoCircle 
                    className="ml-2 text-[#20DDBB] text-xs cursor-help"
                    data-tooltip-id="amount-tooltip"
                    data-tooltip-content="Enter the amount you wish to withdraw."
                  />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={handleAmountChange}
                    className={`w-full bg-[#1A2338]/80 backdrop-blur-sm text-white pl-8 pr-[110px] py-4 rounded-lg focus:ring-2 focus:outline-none transition-all ${
                      amountError 
                        ? 'focus:ring-red-500 border border-red-500/50' 
                        : 'focus:ring-[#20DDBB] border border-[#3f2d63]/70'
                    }`}
                    placeholder="0.00"
                    required
                    min="0"
                    step="0.01"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#20DDBB] font-bold">$</div>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-[#818BAC]">
                    Max: ${safeAvailableBalance.toFixed(2)} {typeof safeAvailableBalance === 'number' ? '' : `(${typeof safeAvailableBalance})`}
                  </div>
                </div>
                {amountError && (
                  <p className="text-red-400 text-sm mt-1">{amountError}</p>
                )}
                <Tooltip id="amount-tooltip" />
              </motion.div>

              <motion.div variants={formItemVariants}>
                <label className="block text-sm text-[#818BAC] mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-3 bg-[#1A2338]/80 backdrop-blur-sm p-2 rounded-lg border border-[#3f2d63]/70">
                  {withdrawalMethods.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all ${
                        method === m.id
                          ? 'bg-gradient-to-r from-[#20DDBB] to-[#18B399] text-[#0F1623] shadow-lg scale-105'
                          : 'text-[#818BAC] hover:bg-[#2A344D]/70 hover:text-white'
                      }`}
                      data-tooltip-id={`method-tooltip-${m.id}`}
                      data-tooltip-content={m.tooltip}
                    >
                      {m.icon}
                      <span className="text-xs mt-1">{m.name}</span>
                      <Tooltip id={`method-tooltip-${m.id}`} />
                    </button>
                  ))}
                </div>
              </motion.div>

              <motion.div 
                className="space-y-4 mt-4"
                variants={formItemVariants}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {method === 'bank_transfer' && (
                  <>
                    <motion.div variants={formItemVariants}>
                      <input
                        type="text"
                        value={details.bankName}
                        onChange={(e) => setDetails({...details, bankName: e.target.value})}
                        className="w-full bg-[#1A2338]/80 backdrop-blur-sm text-white px-4 py-4 rounded-lg border border-[#3f2d63]/70 focus:ring-2 focus:ring-[#20DDBB] focus:outline-none transition-all"
                        placeholder="Bank Name"
                        required
                      />
                    </motion.div>
                    <motion.div variants={formItemVariants}>
                      <input
                        type="text"
                        value={details.accountNumber}
                        onChange={(e) => setDetails({...details, accountNumber: e.target.value})}
                        className="w-full bg-[#1A2338]/80 backdrop-blur-sm text-white px-4 py-4 rounded-lg border border-[#3f2d63]/70 focus:ring-2 focus:ring-[#20DDBB] focus:outline-none transition-all"
                        placeholder="Account Number"
                        required
                      />
                    </motion.div>
                    <motion.div variants={formItemVariants}>
                      <input
                        type="text"
                        value={details.holderName}
                        onChange={(e) => setDetails({...details, holderName: e.target.value})}
                        className="w-full bg-[#1A2338]/80 backdrop-blur-sm text-white px-4 py-4 rounded-lg border border-[#3f2d63]/70 focus:ring-2 focus:ring-[#20DDBB] focus:outline-none transition-all"
                        placeholder="Account Holder Name"
                        required
                      />
                    </motion.div>
                  </>
                )}

                {method === 'paypal' && (
                  <motion.div variants={formItemVariants}>
                    <input
                      type="email"
                      value={details.email}
                      onChange={(e) => setDetails({...details, email: e.target.value})}
                      className="w-full bg-[#1A2338]/80 backdrop-blur-sm text-white px-4 py-4 rounded-lg border border-[#3f2d63]/70 focus:ring-2 focus:ring-[#20DDBB] focus:outline-none transition-all"
                      placeholder="PayPal Email"
                      required
                    />
                  </motion.div>
                )}

                {method === 'card' && (
                  <>
                    <motion.div variants={formItemVariants}>
                      <input
                        type="text"
                        value={details.cardNumber}
                        onChange={(e) => setDetails({...details, cardNumber: e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim()})}
                        className="w-full bg-[#1A2338]/80 backdrop-blur-sm text-white px-4 py-4 rounded-lg border border-[#3f2d63]/70 focus:ring-2 focus:ring-[#20DDBB] focus:outline-none transition-all"
                        placeholder="Card Number"
                        maxLength={19}
                        required
                      />
                    </motion.div>
                    <motion.div className="grid grid-cols-2 gap-4" variants={formItemVariants}>
                      <input
                        type="text"
                        value={details.cardExpiry}
                        onChange={(e) => setDetails({...details, cardExpiry: e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d{2})/, '$1/$2').substr(0, 5)})}
                        className="w-full bg-[#1A2338]/80 backdrop-blur-sm text-white px-4 py-4 rounded-lg border border-[#3f2d63]/70 focus:ring-2 focus:ring-[#20DDBB] focus:outline-none transition-all"
                        placeholder="MM/YY"
                        maxLength={5}
                        required
                      />
                      <input
                        type="text"
                        value={details.cardCVV}
                        onChange={(e) => setDetails({...details, cardCVV: e.target.value.replace(/\D/g, '')})}
                        className="w-full bg-[#1A2338]/80 backdrop-blur-sm text-white px-4 py-4 rounded-lg border border-[#3f2d63]/70 focus:ring-2 focus:ring-[#20DDBB] focus:outline-none transition-all"
                        placeholder="CVV"
                        maxLength={4}
                        required
                      />
                    </motion.div>
                    <motion.div variants={formItemVariants}>
                      <input
                        type="text"
                        value={details.holderName}
                        onChange={(e) => setDetails({...details, holderName: e.target.value})}
                        className="w-full bg-[#1A2338]/80 backdrop-blur-sm text-white px-4 py-4 rounded-lg border border-[#3f2d63]/70 focus:ring-2 focus:ring-[#20DDBB] focus:outline-none transition-all"
                        placeholder="Card Holder Name"
                        required
                      />
                    </motion.div>
                  </>
                )}

                {method === 'crypto' && (
                  <>
                    <motion.div variants={formItemVariants}>
                      <input
                        type="text"
                        value={details.walletAddress}
                        onChange={(e) => setDetails({...details, walletAddress: e.target.value})}
                        className="w-full bg-[#1A2338]/80 backdrop-blur-sm text-white px-4 py-4 rounded-lg border border-[#3f2d63]/70 focus:ring-2 focus:ring-[#20DDBB] focus:outline-none transition-all"
                        placeholder="Wallet Address"
                        required
                      />
                    </motion.div>
                    <motion.div variants={formItemVariants}>
                      <select
                        value={details.network}
                        onChange={(e) => setDetails({...details, network: e.target.value})}
                        className="w-full bg-[#1A2338]/80 backdrop-blur-sm text-white px-4 py-4 rounded-lg border border-[#3f2d63]/70 focus:ring-2 focus:ring-[#20DDBB] focus:outline-none transition-all"
                        required
                      >
                        <option value="">Select Network</option>
                        <option value="ethereum">Ethereum</option>
                        <option value="binance">Binance Smart Chain</option>
                        <option value="polygon">Polygon</option>
                        <option value="solana">Solana</option>
                      </select>
                    </motion.div>
                  </>
                )}
              </motion.div>
              
              {/* Fee summary */}
              {amount && Number(amount) > 0 && (
                <motion.div 
                  className="mt-4 p-5 bg-[#1A2338]/60 backdrop-blur-sm rounded-lg border border-[#3f2d63]/50"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[#818BAC]">Amount:</span>
                    <span className="text-white">${Number(amount).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-[#3f2d63]/50 my-3 pt-3 flex justify-between items-center">
                    <span className="text-white font-medium">You'll receive:</span>
                    <span className="text-[#20DDBB] font-bold">${Number(amount).toFixed(2)}</span>
                  </div>
                </motion.div>
              )}

              <motion.div className="flex gap-4 mt-8" variants={formItemVariants}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-3 bg-[#1A2338]/70 backdrop-blur-sm text-white rounded-lg border border-[#3f2d63]/70 hover:bg-[#1A2338] transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={isSubmitting || !amount || Number(amount) <= 0}
                  className={`flex-1 px-4 py-3 rounded-lg disabled:opacity-50 transition-all ${
                    isSubmitting || !amount || Number(amount) <= 0
                      ? 'bg-gray-600 text-gray-300'
                      : 'bg-gradient-to-r from-[#20DDBB] to-[#18B399] text-white hover:shadow-lg hover:scale-105 active:scale-95'
                  }`}
                  whileHover={{ scale: isSubmitting ? 1 : 1.05 }}
                  whileTap={{ scale: isSubmitting ? 1 : 0.95 }}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Withdraw'
                  )}
                </motion.button>
              </motion.div>
            </motion.form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 