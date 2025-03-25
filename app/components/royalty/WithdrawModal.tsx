"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { FaUniversity, FaPaypal, FaCreditCard, FaInfoCircle, FaMoneyBillWave, FaArrowRight, FaTimes, FaWallet } from 'react-icons/fa';
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
  swiftBic: string;
  bankAddress: string;
  accountIban: string;
  routingNumber: string;
  email: string;
  cardNumber: string;
  cardExpiry: string;
  cardCVV: string;
}

interface FieldErrors {
  [key: string]: string;
}

const withdrawalMethods = [
  {
    id: 'card' as const,
    name: 'Visa',
    icon: <FaCreditCard className="w-5 h-5" />,
    tooltip: "Withdraw funds to your Visa card"
  },
  {
    id: 'paypal' as const,
    name: 'PayPal',
    icon: <FaPaypal className="w-5 h-5" />,
    tooltip: "Fast withdrawal to your PayPal account"
  },
  {
    id: 'bank_transfer' as const,
    name: 'Bank',
    icon: <FaUniversity className="w-5 h-5" />,
    tooltip: "Transfer funds directly to your bank account"
  }
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
    swiftBic: '',
    bankAddress: '',
    accountIban: '',
    routingNumber: '',
    email: '',
    cardNumber: '',
    cardExpiry: '',
    cardCVV: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
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
      setFieldErrors({});
    }
  }, [availableBalance, isOpen]);

  // Сбрасываем ошибки полей при смене метода
  useEffect(() => {
    setFieldErrors({});
  }, [method]);

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

  const validateFields = (): boolean => {
    const errors: FieldErrors = {};
    let isValid = true;

    // Валидация для банковского перевода
    if (method === 'bank_transfer') {
      if (!details.bankName) {
        errors.bankName = 'Bank name is required';
        isValid = false;
      }
      if (!details.accountNumber) {
        errors.accountNumber = 'Account number is required';
        isValid = false;
      }
      if (!details.holderName) {
        errors.holderName = 'Account holder name is required';
        isValid = false;
      }
      if (!details.swiftBic) {
        errors.swiftBic = 'SWIFT/BIC code is required';
        isValid = false;
      }
    }
    
    // Валидация для PayPal
    if (method === 'paypal') {
      if (!details.email) {
        errors.email = 'PayPal email is required';
        isValid = false;
      } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(details.email)) {
        errors.email = 'Please enter a valid email address';
        isValid = false;
      }
    }
    
    // Валидация для карты
    if (method === 'card') {
      // Валидация номера карты - должно быть 16 цифр (убираем пробелы)
      const cardNumber = details.cardNumber.replace(/\s/g, '');
      if (!cardNumber) {
        errors.cardNumber = 'Card number is required';
        isValid = false;
      } else if (!/^\d{16}$/.test(cardNumber)) {
        errors.cardNumber = 'Card number must contain 16 digits';
        isValid = false;
      }
      
      // Валидация даты истечения срока действия (формат MM/YY)
      if (!details.cardExpiry) {
        errors.cardExpiry = 'Expiry date is required';
        isValid = false;
      } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(details.cardExpiry)) {
        errors.cardExpiry = 'Expiry date must be in MM/YY format';
        isValid = false;
      } else {
        // Проверка, что дата не истекла
        const [month, year] = details.cardExpiry.split('/');
        const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
        const currentDate = new Date();
        
        if (expiryDate < currentDate) {
          errors.cardExpiry = 'Card has expired';
          isValid = false;
        }
      }
      
      // Валидация CVV (3-4 цифры)
      if (!details.cardCVV) {
        errors.cardCVV = 'CVV code is required';
        isValid = false;
      } else if (!/^\d{3,4}$/.test(details.cardCVV)) {
        errors.cardCVV = 'CVV must be 3 or 4 digits';
        isValid = false;
      }
      
      // Валидация имени держателя карты
      if (!details.holderName) {
        errors.holderName = 'Cardholder name is required';
        isValid = false;
      } else if (details.holderName.length < 3) {
        errors.holderName = 'Enter full cardholder name as on card';
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Безопасно обрабатываем значение баланса
    const safeBalance = availableBalance !== undefined && availableBalance !== null 
      ? availableBalance 
      : 0;

    if (!amount || Number(amount) <= 0) {
      setAmountError('Please enter a valid amount');
      toast.error('Please enter a valid withdrawal amount');
      return;
    }

    if (Number(amount) > safeBalance) {
      setAmountError('Insufficient balance');
      toast.error('Insufficient balance for withdrawal');
      return;
    }

    // Валидация полей в зависимости от метода вывода
    if (!validateFields()) {
      toast.error('Please fill in all required fields correctly');
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
              account_holder: details.holderName,
              swift_bic: details.swiftBic,
              bank_address: details.bankAddress,
              iban: details.accountIban,
              routing_number: details.routingNumber
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
            visa_card: {
              card_number: details.cardNumber.replace(/\s/g, ''),
              expiry_date: details.cardExpiry,
              cvv: details.cardCVV,
              card_holder: details.holderName
            }
          };
          break;
      }

      await onWithdraw(Number(amount), method, withdrawalDetails);
      setOperationCompleted(true);
      
      // Сбрасываем форму после успешного вывода
      setAmount('');
      setDetails({
        bankName: '',
        accountNumber: '',
        holderName: '',
        swiftBic: '',
        bankAddress: '',
        accountIban: '',
        routingNumber: '',
        email: '',
        cardNumber: '',
        cardExpiry: '',
        cardCVV: '',
      });
    } catch (error) {
      console.error('Withdrawal submission error:', error);
      toast.error('Failed to process withdrawal request');
    } finally {
      setIsSubmitting(false);
    }
  };

  console.log('WithdrawModal рендеринг с балансом:', {
    availableBalance,
    isOpen,
    operationCompleted
  });

  // Render the withdrawal form based on the selected method
  const renderWithdrawalForm = () => {
    switch (method) {
      case 'bank_transfer':
        return (
          <>
            <motion.div variants={formItemVariants} className="mb-4">
              <label htmlFor="holderName" className="block text-sm font-medium text-white mb-1">
                Account Holder Name
              </label>
              <input
                id="holderName"
                type="text"
                value={details.holderName}
                onChange={(e) => setDetails({ ...details, holderName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#1A2338]/80 border border-[#3f2d63]/70 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#583d8c] focus:border-transparent"
                placeholder="John Smith"
              />
              {fieldErrors.holderName && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.holderName}</p>
              )}
            </motion.div>

            <motion.div variants={formItemVariants} className="mb-4">
              <label htmlFor="bankName" className="block text-sm font-medium text-white mb-1">
                Bank Name
              </label>
              <input
                id="bankName"
                type="text"
                value={details.bankName}
                onChange={(e) => setDetails({ ...details, bankName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#1A2338]/80 border border-[#3f2d63]/70 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#583d8c] focus:border-transparent"
                placeholder="Enter bank name"
              />
              {fieldErrors.bankName && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.bankName}</p>
              )}
            </motion.div>

            <motion.div variants={formItemVariants} className="mb-4">
              <label htmlFor="accountNumber" className="block text-sm font-medium text-white mb-1">
                Account Number
              </label>
              <input
                id="accountNumber"
                type="text"
                value={details.accountNumber}
                onChange={(e) => setDetails({ ...details, accountNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#1A2338]/80 border border-[#3f2d63]/70 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#583d8c] focus:border-transparent"
                placeholder="Enter account number"
              />
              {fieldErrors.accountNumber && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.accountNumber}</p>
              )}
            </motion.div>

            <motion.div variants={formItemVariants} className="mb-4">
              <label htmlFor="swiftBic" className="block text-sm font-medium text-white mb-1">
                SWIFT/BIC Code
              </label>
              <input
                id="swiftBic"
                type="text"
                value={details.swiftBic}
                onChange={(e) => setDetails({ ...details, swiftBic: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#1A2338]/80 border border-[#3f2d63]/70 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#583d8c] focus:border-transparent"
                placeholder="Enter SWIFT/BIC code"
              />
              {fieldErrors.swiftBic && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.swiftBic}</p>
              )}
            </motion.div>

            <motion.div variants={formItemVariants} className="mb-4">
              <label htmlFor="accountIban" className="block text-sm font-medium text-white mb-1">
                IBAN (Optional)
              </label>
              <input
                id="accountIban"
                type="text"
                value={details.accountIban}
                onChange={(e) => setDetails({ ...details, accountIban: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#1A2338]/80 border border-[#3f2d63]/70 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#583d8c] focus:border-transparent"
                placeholder="Enter IBAN (if applicable)"
              />
            </motion.div>

            <motion.div variants={formItemVariants} className="mb-4">
              <label htmlFor="routingNumber" className="block text-sm font-medium text-white mb-1">
                Routing Number (Optional)
              </label>
              <input
                id="routingNumber"
                type="text"
                value={details.routingNumber}
                onChange={(e) => setDetails({ ...details, routingNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#1A2338]/80 border border-[#3f2d63]/70 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#583d8c] focus:border-transparent"
                placeholder="Enter routing number"
              />
            </motion.div>

            <motion.div variants={formItemVariants} className="mb-4">
              <label htmlFor="bankAddress" className="block text-sm font-medium text-white mb-1">
                Bank Address (Optional)
              </label>
              <textarea
                id="bankAddress"
                value={details.bankAddress}
                onChange={(e) => setDetails({ ...details, bankAddress: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#1A2338]/80 border border-[#3f2d63]/70 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#583d8c] focus:border-transparent h-20 resize-none"
                placeholder="Enter bank address"
              />
            </motion.div>
          </>
        );
      case 'paypal':
        return (
          <motion.div variants={formItemVariants} className="mb-4">
            <label htmlFor="paypalEmail" className="block text-sm font-medium text-white mb-1">
              PayPal Email
            </label>
            <input
              id="paypalEmail"
              type="email"
              value={details.email}
              onChange={(e) => setDetails({ ...details, email: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#1A2338]/80 border border-[#3f2d63]/70 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#583d8c] focus:border-transparent"
              placeholder="your-email@example.com"
            />
            {fieldErrors.email && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>
            )}
          </motion.div>
        );
      case 'card':
        return (
          <>
            <motion.div variants={formItemVariants} className="mb-4">
              <label htmlFor="cardholderName" className="block text-sm font-medium text-white mb-1">
                Cardholder Name
              </label>
              <input
                id="cardholderName"
                type="text"
                value={details.holderName}
                onChange={(e) => setDetails({ ...details, holderName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#1A2338]/80 border border-[#3f2d63]/70 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#583d8c] focus:border-transparent"
                placeholder="John Smith"
              />
              {fieldErrors.holderName && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.holderName}</p>
              )}
            </motion.div>

            <motion.div variants={formItemVariants} className="mb-4">
              <label htmlFor="cardNumber" className="block text-sm font-medium text-white mb-1">
                Card Number
              </label>
              <input
                id="cardNumber"
                type="text"
                value={details.cardNumber}
                onChange={(e) => {
                  // Format card number with spaces for readability
                  const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                  const formatted = value.replace(/(.{4})/g, '$1 ').trim();
                  setDetails({ ...details, cardNumber: formatted });
                }}
                maxLength={19} // 16 digits + 3 spaces
                className="w-full px-3 py-2 rounded-lg bg-[#1A2338]/80 border border-[#3f2d63]/70 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#583d8c] focus:border-transparent"
                placeholder="1234 5678 9012 3456"
              />
              {fieldErrors.cardNumber && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.cardNumber}</p>
              )}
            </motion.div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <motion.div variants={formItemVariants}>
                <label htmlFor="cardExpiry" className="block text-sm font-medium text-white mb-1">
                  Expiry Date
                </label>
                <input
                  id="cardExpiry"
                  type="text"
                  value={details.cardExpiry}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length > 4) value = value.slice(0, 4);
                    
                    if (value.length > 2) {
                      value = `${value.slice(0, 2)}/${value.slice(2)}`;
                    }
                    
                    setDetails({ ...details, cardExpiry: value });
                  }}
                  maxLength={5} // MM/YY
                  className="w-full px-3 py-2 rounded-lg bg-[#1A2338]/80 border border-[#3f2d63]/70 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#583d8c] focus:border-transparent"
                  placeholder="MM/YY"
                />
                {fieldErrors.cardExpiry && (
                  <p className="text-red-400 text-xs mt-1">{fieldErrors.cardExpiry}</p>
                )}
              </motion.div>

              <motion.div variants={formItemVariants}>
                <label htmlFor="cardCVV" className="block text-sm font-medium text-white mb-1">
                  CVV
                </label>
                <input
                  id="cardCVV"
                  type="text"
                  value={details.cardCVV}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setDetails({ ...details, cardCVV: value });
                  }}
                  maxLength={4}
                  className="w-full px-3 py-2 rounded-lg bg-[#1A2338]/80 border border-[#3f2d63]/70 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#583d8c] focus:border-transparent"
                  placeholder="123"
                />
                {fieldErrors.cardCVV && (
                  <p className="text-red-400 text-xs mt-1">{fieldErrors.cardCVV}</p>
                )}
              </motion.div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  // Render the success state after withdrawal is completed
  const renderSuccessState = () => (
    <motion.div 
      className="text-center p-6" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">Withdrawal Successful!</h3>
      <p className="text-[#9BA3BF] text-sm mb-6">
        Your withdrawal request for ${amount} has been successfully submitted. 
        Please allow 1-3 business days for processing.
      </p>
    </motion.div>
  );

  // Fix for mobile scrolling issues
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={backdropVariants}
        >
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-[#1A2338]/80 backdrop-blur-xl text-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden z-10 border border-[#3f2d63]/30"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Close button */}
              <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-white transition-colors hover:bg-[#3f2d63]/50 z-20"
              aria-label="Close"
              >
              <FaTimes className="w-5 h-5" />
              </button>

            {/* Header */}
            <div className="px-6 py-5 border-b border-[#3f2d63]/30 bg-gradient-to-r from-[#3f2d63]/50 via-[#4e9ab3]/30 to-transparent backdrop-blur-md">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-[#20DDBB]/30 to-[#3f2d63]/30 rounded-full flex items-center justify-center shadow-inner backdrop-blur-sm mr-3">
                  <FaMoneyBillWave className="text-[#20DDBB] text-xl animate-floatY" />
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-white to-[#cfd1e1] bg-clip-text text-transparent">Withdraw Funds</h2>
              </div>
              <p className="text-[#9BA3BF] text-sm mt-2 pl-[52px]">Transfer your earnings to your preferred payment method</p>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Show success screen or the form based on operation status */}
              {operationCompleted ? (
                renderSuccessState()
              ) : (
                <form onSubmit={handleSubmit}>
                  {/* Available Balance */}
                  <div className="bg-gradient-to-r from-[#1A2338]/80 to-[#1A2338]/60 backdrop-blur-lg p-4 rounded-xl mb-6 border border-[#3f2d63]/30 shadow-inner">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-[#3f2d63]/30 flex items-center justify-center mr-2">
                          <FaWallet className="text-[#20DDBB] text-sm" />
                        </div>
                        <span className="text-[#9BA3BF]">Available Balance:</span>
                      </div>
                      <span className="text-white font-bold text-lg bg-gradient-to-r from-[#20DDBB] to-white bg-clip-text text-transparent">${(availableBalance || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Withdrawal Amount */}
                  <motion.div variants={formItemVariants} className="mb-6">
                    <label htmlFor="amount" className="block text-sm font-medium text-white mb-1">
                      Amount to Withdraw
                </label>
                <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                  <input
                        id="amount"
                    type="number"
                    value={amount}
                    onChange={handleAmountChange}
                        className={`w-full px-6 py-2.5 rounded-xl bg-[#1A2338]/90 border ${
                          amountError ? 'border-red-500' : 'border-[#3f2d63]/70'
                        } text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#583d8c] focus:border-transparent`}
                    placeholder="0.00"
                    step="0.01"
                        min="0.01"
                        max={availableBalance}
                  />
                  </div>
                    {amountError && <p className="text-red-400 text-xs mt-1">{amountError}</p>}
              </motion.div>

                  {/* Withdrawal Method Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-white mb-2">
                      Withdrawal Method
                </label>
                    <div className="grid grid-cols-3 gap-3">
                      {withdrawalMethods.map((withdrawalMethod) => (
                        <motion.button
                          key={withdrawalMethod.id}
                      type="button"
                          onClick={() => setMethod(withdrawalMethod.id)}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
                            method === withdrawalMethod.id
                              ? 'bg-gradient-to-br from-[#20DDBB]/20 via-[#4e9ab3]/20 to-[#3f2d63]/50 border border-[#20DDBB]/40 shadow-lg shadow-[#20DDBB]/10'
                              : 'bg-[#1A2338]/80 border border-[#3f2d63]/30 hover:border-[#3f2d63]/50'
                          }`}
                          whileHover={{ 
                            y: -5, 
                            boxShadow: method === withdrawalMethod.id 
                              ? '0 15px 30px -5px rgba(32, 221, 187, 0.3)' 
                              : '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
                          }}
                          whileTap={{ y: 0 }}
                          data-tooltip-id={`tooltip-${withdrawalMethod.id}`}
                          data-tooltip-content={withdrawalMethod.tooltip}
                        >
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 backdrop-blur-sm ${
                            method === withdrawalMethod.id
                              ? 'bg-gradient-to-r from-[#20DDBB]/40 to-[#4e9ab3]/30 text-[#20DDBB] animate-glow'
                              : 'bg-[#1A2338]/90 text-gray-400'
                          }`}>
                            {withdrawalMethod.icon}
                          </div>
                          <span className={`text-sm font-medium ${
                            method === withdrawalMethod.id ? 'text-white' : 'text-gray-400'
                          }`}>
                            {withdrawalMethod.name}
                          </span>
                        </motion.button>
                      ))}
                      {withdrawalMethods.map((withdrawalMethod) => (
                        <Tooltip key={withdrawalMethod.id} id={`tooltip-${withdrawalMethod.id}`} />
                  ))}
                </div>
                  </div>

                  {/* Dynamic Form Fields Based on Selected Method */}
              <motion.div 
                    variants={staggeredFormVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {renderWithdrawalForm()}
              </motion.div>
              
                  {/* Submit Button */}
                  <motion.div variants={formItemVariants} className="flex justify-end mt-6">
                <button
                  type="submit"
                      disabled={isSubmitting || !amount || Number(amount) <= 0 || Number(amount) > (availableBalance || 0)}
                      className={`rounded-full bg-gradient-to-r from-[#20DDBB]/90 via-[#4e9ab3] to-[#3f2d63]/90 px-6 py-3.5 text-white 
                        font-medium flex items-center gap-2 transition-all border border-[#20DDBB]/30 backdrop-blur-lg
                        shadow-xl animate-gradient relative overflow-hidden group ${
                        isSubmitting || !amount || Number(amount) <= 0 || Number(amount) > (availableBalance || 0)
                          ? 'opacity-60 cursor-not-allowed'
                          : 'hover:shadow-[0_0_30px_rgba(32,221,187,0.5)] hover:scale-105'
                      }`}
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 
                        group-hover:opacity-100 group-hover:animate-shimmer transition-opacity duration-500"></span>
                      
                      <div className="flex items-center relative z-10">
                  {isSubmitting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                          </>
                  ) : (
                          <>
                            Withdraw ${amount || '0.00'}
                            <FaArrowRight className="text-sm ml-1 animate-floatY" />
                          </>
                  )}
                      </div>
                    </button>
              </motion.div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 