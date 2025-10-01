"use client";

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { FaUniversity, FaPaypal, FaCreditCard, FaInfoCircle, FaMoneyBillWave, FaArrowRight, FaTimes, FaWallet, FaEnvelope, FaCheck, FaExclamationCircle, FaCalendarAlt, FaLock } from 'react-icons/fa';
import { Tooltip } from 'react-tooltip';
import { FaCcVisa, FaCcMastercard, FaCcAmex } from 'react-icons/fa';

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

export default function WithdrawModal({
  isOpen,
  onClose,
  userId,
  availableBalance,
  onWithdraw
}: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<WithdrawalMethod>('card');
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

  const getCardTypeIcon = (cardNumber: string) => {
    // Basic regex patterns for card type identification
    const patterns = {
      visa: /^4\d{0,15}/,
      mastercard: /^5[1-5]\d{0,14}/,
      amex: /^3[47]\d{0,13}/,
      discover: /^6(?:011|5\d{0,2})\d{0,12}/,
      diners: /^3(?:0[0-5]|[68]\d)\d{0,11}/,
      jcb: /^(?:2131|1800|35\d{0,3})\d{0,11}/,
    };

    // Strip spaces
    const cleanNumber = cardNumber.replace(/\s+/g, '');
    
    // Detect card type
    if (patterns.visa.test(cleanNumber)) return 'Visa';
    if (patterns.mastercard.test(cleanNumber)) return 'Mastercard';
    if (patterns.amex.test(cleanNumber)) return 'Amex';
    if (patterns.discover.test(cleanNumber)) return 'Discover';
    if (patterns.diners.test(cleanNumber)) return 'Diners';
    if (patterns.jcb.test(cleanNumber)) return 'JCB';
    
    // Default if no pattern matched
    return 'Card';
  };

  const getCardTypeClass = (cardType: string) => {
    switch (cardType) {
      case 'Visa':
        return 'text-blue-400';
      case 'Mastercard':
        return 'text-red-400';
      case 'Amex':
        return 'text-purple-400';
      case 'Discover':
        return 'text-orange-400';
      case 'Diners':
        return 'text-yellow-400';
      case 'JCB':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const getCardNumberFormat = (cardNumber: string) => {
    // Detect the card type
    const cardType = getCardTypeIcon(cardNumber);
    const cleanNumber = cardNumber.replace(/\s+/g, '');
    
    // Format based on card type
    if (cardType === 'Amex') {
      // Amex format: XXXX XXXXXX XXXXX (4-6-5)
      let formatted = '';
      for (let i = 0; i < cleanNumber.length; i++) {
        if (i === 4 || i === 10) formatted += ' ';
        formatted += cleanNumber[i];
      }
      return formatted;
    } else {
      // Default format for other cards: XXXX XXXX XXXX XXXX (4-4-4-4)
      let formatted = '';
      for (let i = 0; i < cleanNumber.length; i++) {
        if (i > 0 && i % 4 === 0) formatted += ' ';
        formatted += cleanNumber[i];
      }
      return formatted;
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Remove all existing spaces from the input
    let value = input.replace(/\s/g, '');
    
    // Keep only numeric characters
    value = value.replace(/\D/g, '');
    
    // Limit the length based on card type
    const cardType = getCardTypeIcon(value);
    const maxLength = cardType === 'Amex' ? 15 : 16;
    value = value.slice(0, maxLength);
    
    // Apply the appropriate formatting
    const formattedValue = getCardNumberFormat(value);
    
    // Update the card number in state
    setDetails((prev) => ({
      ...prev,
      cardNumber: formattedValue,
    }));
    
    // Validate the card number
    const cleanValue = formattedValue.replace(/\s/g, '');
    if (cleanValue.length === 0) {
      // Empty field, remove any existing error
      const { cardNumber, ...restErrors } = fieldErrors;
      setFieldErrors(restErrors);
    } else if ((cardType === 'Amex' && cleanValue.length === 15) || 
              (cardType !== 'Amex' && cleanValue.length === 16)) {
      // Valid card number length
      const { cardNumber, ...restErrors } = fieldErrors;
      setFieldErrors(restErrors);
    } else {
      // Incomplete card number
      setFieldErrors({
        ...fieldErrors,
        cardNumber: `Card number must be ${cardType === 'Amex' ? 15 : 16} digits`,
      });
    }
  };

  // Handle paste events for card number - strip non-numeric characters and format
  const handleCardNumberPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Filter out all non-numeric characters from the pasted content
    const numericOnly = pastedText.replace(/[^0-9]/g, '');
    
    // Get the potential card type
    const cardType = getCardTypeIcon(numericOnly);
    const maxLength = cardType === 'Amex' ? 15 : 16;
    
    // Limit to max length based on card type
    const limitedNumeric = numericOnly.slice(0, maxLength);
    
    // Apply formatting based on card type
    const formattedValue = getCardNumberFormat(limitedNumeric);
    
    // Update the card number in the state
    setDetails((prev) => ({
      ...prev,
      cardNumber: formattedValue,
    }));
    
    // Clear error if the card number is valid or set appropriate error
    const requiredLength = cardType === 'Amex' ? 15 : 16;
    if (limitedNumeric.length === requiredLength) {
      // Valid card number - clear any existing error
      const { cardNumber, ...restErrors } = fieldErrors;
      setFieldErrors(restErrors);
    } else if (limitedNumeric.length > 0 && limitedNumeric.length < requiredLength) {
      // Incomplete card number
      setFieldErrors({ 
        ...fieldErrors, 
        cardNumber: `Card number must contain ${requiredLength} digits` 
      });
    }
    
    // Show toast feedback for pasted content
    if (numericOnly.length === 0 && pastedText.trim() !== '') {
      toast.error('Please paste a valid card number containing only digits');
    } else if (numericOnly.length > 0 && numericOnly.length < requiredLength) {
      toast.success(`Card number incomplete: ${numericOnly.length}/${requiredLength} digits`, { duration: 2000 });
    } else if (numericOnly.length === requiredLength) {
      toast.success(`${cardType} card detected and added successfully`);
    }
  };

  // Format expiry date as MM/YY
  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Remove all non-digit characters except the slash
    let value = input.replace(/[^\d/]/g, '');
    
    // Remove any slash that might have been manually entered
    value = value.replace('/', '');
    
    if (value.length <= 4) {
      let formattedValue = value;
      
      // Automatically add the slash after the month
      if (value.length >= 2) {
        formattedValue = value.substring(0, 2) + '/' + value.substring(2);
        
        // Validate month
        const month = parseInt(value.substring(0, 2));
        if (month < 1 || month > 12) {
          setFieldErrors({ ...fieldErrors, cardExpiry: 'Invalid month (01-12)' });
        } else {
          // Clear the month error
          const { cardExpiry, ...restErrors } = fieldErrors;
          setFieldErrors(restErrors);
        }
      }
      
      setDetails({ ...details, cardExpiry: formattedValue });
    }
  };

  // Handle paste events for expiry date
  const handleExpiryDatePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const digits = pastedText.replace(/\D/g, '').substring(0, 4);
    
    if (digits.length > 0) {
      let formattedValue = '';
      if (digits.length >= 2) {
        formattedValue = digits.substring(0, 2) + '/' + digits.substring(2, 4);
      } else {
        formattedValue = digits;
      }
      
      setDetails({ ...details, cardExpiry: formattedValue });
      
      // Validate month
      if (digits.length >= 2) {
        const month = parseInt(digits.substring(0, 2));
        if (month < 1 || month > 12) {
          setFieldErrors({ ...fieldErrors, cardExpiry: 'Invalid month (01-12)' });
          toast.error('Invalid month. Must be between 01-12');
        } else {
          const { cardExpiry, ...restErrors } = fieldErrors;
          setFieldErrors(restErrors);
          
          // Check if the expiry date is complete (MM/YY)
          if (digits.length === 4) {
            const year = parseInt(digits.substring(2, 4));
            const currentYear = new Date().getFullYear() % 100; // Get last 2 digits of year
            const currentMonth = new Date().getMonth() + 1; // Months are 0-based
            
            if (year < currentYear || (year === currentYear && month < currentMonth)) {
              setFieldErrors({ ...fieldErrors, cardExpiry: 'Card has expired' });
              toast.error('The card has expired');
            } else {
              toast.success('Expiry date added successfully');
            }
          } else {
            toast.success('Please complete the year in the expiry date', { duration: 2000 });
          }
        }
      } else {
        toast.success('Please enter a valid month (MM) first', { duration: 2000 });
      }
    } else if (pastedText.trim() !== '') {
      toast.error('Please paste a valid expiry date containing only digits');
    }
  };

  // Validate expiry date when field loses focus
  const handleExpiryDateBlur = () => {
    if (!details.cardExpiry) return;
    
    // Check if it matches MM/YY format
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(details.cardExpiry)) {
      setFieldErrors({ ...fieldErrors, cardExpiry: 'Expiry date must be in MM/YY format' });
      return;
    }
    
    // Check if the card has expired
    const [month, year] = details.cardExpiry.split('/');
    const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
    const currentDate = new Date();
    
    if (expiryDate < currentDate) {
      setFieldErrors({ ...fieldErrors, cardExpiry: 'Card has expired' });
    } else {
      // Clear any expiry date errors if validation passes
      const { cardExpiry, ...restErrors } = fieldErrors;
      setFieldErrors(restErrors);
    }
  };

  // Limit CVV to 3-4 digits
  const handleCVVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Keep only digits
    
    if (value.length <= 4) {
      setDetails({ ...details, cardCVV: value });
    }
  };

  // Handle paste events for CVV
  const handleCVVPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const digits = pastedText.replace(/\D/g, '').substring(0, 4);
    
    if (digits.length > 0) {
      setDetails({ ...details, cardCVV: digits });
      
      // Provide feedback based on the pasted CVV
      if (digits.length < 3) {
        setFieldErrors({ ...fieldErrors, cardCVV: 'CVV must be at least 3 digits' });
        toast.error('CVV must contain at least 3 digits');
      } else {
        // Clear any CVV errors
        const { cardCVV, ...restErrors } = fieldErrors;
        setFieldErrors(restErrors);
        
        if (digits.length >= 3) {
          toast.success('CVV added successfully');
        }
      }
    } else if (pastedText.trim() !== '') {
      toast.error('Please paste a valid CVV containing only digits');
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
      // Validate card number based on card type
      const cardNumber = details.cardNumber.replace(/\s/g, '');
      const cardType = getCardTypeIcon(cardNumber);
      const requiredLength = cardType === 'Amex' ? 15 : 16;
      
      if (!cardNumber) {
        errors.cardNumber = 'Card number is required';
        isValid = false;
      } else if (cardNumber.length !== requiredLength) {
        errors.cardNumber = `Card number must contain ${requiredLength} digits`;
        isValid = false;
      }
      
      // Additional Luhn algorithm validation (card checksum)
      if (cardNumber.length === requiredLength) {
        // Luhn algorithm implementation for card number validation
        let sum = 0;
        let shouldDouble = false;
        
        // Start from the rightmost digit and move left
        for (let i = cardNumber.length - 1; i >= 0; i--) {
          let digit = parseInt(cardNumber.charAt(i));
          
          if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
          }
          
          sum += digit;
          shouldDouble = !shouldDouble;
        }
        
        // If the sum is not divisible by 10, the card number is invalid
        if (sum % 10 !== 0) {
          errors.cardNumber = 'Invalid card number';
          isValid = false;
        }
      }
      
      // Валидация даты истечения срока действия (формат MM/YY)
      if (!details.cardExpiry) {
        errors.cardExpiry = 'Expiry date is required';
        isValid = false;
      } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(details.cardExpiry)) {
        errors.cardExpiry = 'Expiry date must be in MM/YY format';
        isValid = false;
      } else {
        // Check if the card is expired
        const [month, year] = details.cardExpiry.split('/');
        const expiryDate = new Date(2000 + parseInt(year), parseInt(month));
        const currentDate = new Date();
        
        // Set the expiry date to the last day of the month
        expiryDate.setDate(0);
        
        if (expiryDate < currentDate) {
          errors.cardExpiry = 'Card has expired';
          isValid = false;
        }
      }
      
      // Валидация CVV (3-4 цифры в зависимости от типа карты)
      const cvvLength = cardType === 'Amex' ? 4 : 3;
      if (!details.cardCVV) {
        errors.cardCVV = 'CVV is required';
        isValid = false;
      } else if (details.cardCVV.length !== cvvLength) {
        errors.cardCVV = `CVV must be ${cvvLength} digits`;
        isValid = false;
      }
      
      // Validate cardholder name
      if (!details.holderName) {
        errors.holderName = 'Cardholder name is required';
        isValid = false;
      } else if (details.holderName.length < 3) {
        errors.holderName = 'Please enter a valid cardholder name';
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
      
      // Dispatch custom event to trigger real-time update in the withdrawal tab
      const customEvent = new CustomEvent('withdrawal-processed', { 
        detail: { 
          userId: userId, 
          timestamp: new Date().toISOString(),
          method: method,
          amount: Number(amount)
        } 
      });
      window.dispatchEvent(customEvent);
      console.log('✅ Dispatched withdrawal-processed event for real-time UI update');
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
    return (
      <form
        onSubmit={handleSubmit}
        className="text-gray-100 space-y-5"
      >
        {/* Секция выбора метода */}
        <div className="mb-6">
          <div className="mb-2 flex justify-between items-center">
            <label className="text-sm font-medium text-gray-300">Withdrawal Method</label>
            <FaInfoCircle
              className="text-[#20DDBB] text-sm cursor-help"
              data-tooltip-id="method-tooltip"
              data-tooltip-content="Choose your preferred method to withdraw your royalty earnings"
            />
          </div>
          
          <div className="flex gap-3">
            {withdrawalMethods.map((withdrawMethod) => (
              <div key={withdrawMethod.id} className="flex-1">
                <input
                  type="radio"
                  id={`method-${withdrawMethod.id}`}
                  className="hidden peer"
                  checked={withdrawMethod.id === method}
                  onChange={() => setMethod(withdrawMethod.id)}
                />
                <label
                  htmlFor={`method-${withdrawMethod.id}`}
                  data-tooltip-id={`${withdrawMethod.id}-tooltip`}
                  data-tooltip-content={withdrawMethod.tooltip}
                  onClick={() => setMethod(withdrawMethod.id)}
                  className={`
                    flex flex-col items-center justify-center py-4 px-2 rounded-lg cursor-pointer border transition-all duration-200
                    ${withdrawMethod.id === method 
                      ? 'bg-gradient-to-br from-[#20DDBB]/10 to-[#1f2942] border-[#20DDBB]/30 shadow-lg shadow-[#20DDBB]/5' 
                      : 'bg-[#1f2942]/60 border-white/5 hover:bg-[#1f2942]/80 hover:border-[#20DDBB]/10'
                    }
                  `}
                >
                  <div className={`p-2.5 rounded-full mb-2 ${
                    withdrawMethod.id === method 
                      ? 'bg-[#20DDBB]/15 text-[#20DDBB]' 
                      : 'bg-[#1A2338]/60 text-gray-400'
                  }`}>
                    {withdrawMethod.icon}
                  </div>
                  <span className={`text-sm font-medium ${
                    withdrawMethod.id === method ? 'text-[#20DDBB]' : 'text-gray-300'
                  }`}>
                    {withdrawMethod.name}
                  </span>
                </label>
                <Tooltip id={`${withdrawMethod.id}-tooltip`} />
              </div>
            ))}
          </div>
        </div>
        
        {/* Поле ввода суммы */}
        <div className="mb-6">
          <div className="mb-2 flex justify-between items-center">
            <label className="text-sm font-medium text-gray-300">
              Amount (USD)
            </label>
            <div className="flex items-center gap-1">
              <FaMoneyBillWave className="text-[#20DDBB] text-sm" />
              <span className="text-[#20DDBB] text-sm font-medium">
                Available: ${availableBalance?.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <FaMoneyBillWave className="text-gray-400" />
            </div>
            <input
              type="number"
              step="0.01"
              className={`bg-[#1f2942]/80 border ${
                amountError ? 'border-red-500/50' : 'border-white/10 focus:border-[#20DDBB]/50'
              } text-white py-3 px-10 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30`}
              placeholder="0.00"
              value={amount}
              onChange={handleAmountChange}
              onBlur={() => {
                if (amount && !amountError) {
                  setAmount(parseFloat(amount).toFixed(2));
                }
              }}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
              <span className="text-gray-400 font-medium">USD</span>
            </div>
          </div>
          
          {amountError && (
            <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
              <FaInfoCircle /> {amountError}
            </p>
          )}
        </div>

        {/* Поля ввода в зависимости от выбранного метода */}
        {method === 'card' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Credit Card Form with enhanced UI */}
            <div className="mb-6 bg-[#1A2338]/50 p-4 rounded-xl border border-[#3f2d63]/30">
              {/* Card Info Header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white text-sm font-medium">Card Information</h3>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[#818BAC] text-xs">Supported:</span>
                  <FaCcVisa className="text-blue-400 text-lg" />
                  <FaCcMastercard className="text-red-400 text-lg" />
                  <FaCcAmex className="text-purple-400 text-lg" />
                </div>
              </div>
              
              {/* Card Type Indicator */}
              {details.cardNumber && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 flex justify-between items-center"
                >
                  <span className="text-xs text-[#818BAC]">
                    {getCardTypeIcon(details.cardNumber)} detected
                  </span>
                  <span className={`text-sm font-medium ${getCardTypeClass(getCardTypeIcon(details.cardNumber))}`}>
                    {details.cardNumber && getCardTypeIcon(details.cardNumber) !== 'Card' ? (
                      <span>●●●● {details.cardNumber.replace(/\s/g, '').slice(-4)}</span>
                    ) : null}
                  </span>
                </motion.div>
              )}

              <div className="mb-4">
                <div className="mb-2 flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-300">Card Number</label>
                  {details.cardNumber && (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`text-xs font-medium ${getCardTypeClass(getCardTypeIcon(details.cardNumber))}`}
                    >
                      {getCardTypeIcon(details.cardNumber)}
                    </motion.span>
                  )}
                </div>
                <div className="relative transition-all duration-300">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <FaCreditCard className={`transition-colors duration-300 ${details.cardNumber ? getCardTypeClass(getCardTypeIcon(details.cardNumber)) : "text-gray-400"}`} />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9\s]*"
                    placeholder="1234 5678 9012 3456"
                    value={details.cardNumber}
                    onChange={handleCardNumberChange}
                    onPaste={handleCardNumberPaste}
                    onKeyPress={(e) => {
                      // Only allow digits, prevent any non-numeric input
                      if (!/[0-9]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onKeyDown={(e) => {
                      // Allow: backspace, delete, tab, escape, enter, arrows
                      if ([46, 8, 9, 27, 13, 37, 39, 110].indexOf(e.keyCode) !== -1 ||
                          // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                          (e.keyCode === 65 && e.ctrlKey === true) ||
                          (e.keyCode === 67 && e.ctrlKey === true) ||
                          (e.keyCode === 86 && e.ctrlKey === true) ||
                          (e.keyCode === 88 && e.ctrlKey === true) ||
                          // Allow: home, end
                          (e.keyCode >= 35 && e.keyCode <= 39)) {
                        // Let it happen, don't do anything
                        return;
                      }
                      // Ensure that it is a number or stop the keypress
                      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) &&
                          (e.keyCode < 96 || e.keyCode > 105)) {
                        e.preventDefault();
                      }
                    }}
                    className={`bg-[#1f2942]/80 border ${
                      fieldErrors.cardNumber ? 'border-red-500/50' : 'border-white/10 focus:border-[#20DDBB]/50'
                    } text-white py-3 px-10 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30 transition duration-300`}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                    {details.cardNumber && !fieldErrors.cardNumber && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-green-400"
                      >
                        <FaCheck size={14} />
                      </motion.span>
                    )}
                  </div>
                </div>
                {fieldErrors.cardNumber && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-1 text-xs text-red-400 flex items-center gap-1"
                  >
                    <FaExclamationCircle size={12} /> {fieldErrors.cardNumber}
                  </motion.p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="mb-4">
                  <div className="mb-2">
                    <label className="text-sm font-medium text-gray-300">Expiry Date</label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                      <FaCalendarAlt className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9/]*"
                      placeholder="MM/YY"
                      value={details.cardExpiry}
                      onChange={handleExpiryDateChange}
                      onKeyPress={(e) => {
                        // Only allow digits and slash
                        if (!/[0-9/]/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      onBlur={handleExpiryDateBlur}
                      onPaste={handleExpiryDatePaste}
                      className={`bg-[#1f2942]/80 border ${
                        fieldErrors.cardExpiry ? 'border-red-500/50' : 'border-white/10 focus:border-[#20DDBB]/50'
                      } text-white py-3 pl-10 pr-4 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30 transition duration-300`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                      {details.cardExpiry && details.cardExpiry.length === 5 && !fieldErrors.cardExpiry && (
                        <motion.span 
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-green-400"
                        >
                          <FaCheck size={14} />
                        </motion.span>
                      )}
                    </div>
                  </div>
                  {fieldErrors.cardExpiry && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-1 text-xs text-red-400 flex items-center gap-1"
                    >
                      <FaExclamationCircle size={12} /> {fieldErrors.cardExpiry}
                    </motion.p>
                  )}
                </div>

                <div className="mb-4">
                  <div className="mb-2">
                    <label className="text-sm font-medium text-gray-300">CVV</label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                      <FaLock className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="123"
                      value={details.cardCVV}
                      onChange={handleCVVChange}
                      onPaste={handleCVVPaste}
                      onKeyPress={(e) => {
                        // Only allow digits
                        if (!/[0-9]/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      maxLength={4}
                      className={`bg-[#1f2942]/80 border ${
                        fieldErrors.cardCVV ? 'border-red-500/50' : 'border-white/10 focus:border-[#20DDBB]/50'
                      } text-white py-3 pl-10 pr-4 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30 transition duration-300`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                      {details.cardCVV && details.cardCVV.length >= 3 && !fieldErrors.cardCVV && (
                        <motion.span 
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-green-400"
                        >
                          <FaCheck size={14} />
                        </motion.span>
                      )}
                    </div>
                  </div>
                  {fieldErrors.cardCVV && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-1 text-xs text-red-400 flex items-center gap-1"
                    >
                      <FaExclamationCircle size={12} /> {fieldErrors.cardCVV}
                    </motion.p>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <div className="mb-2">
                  <label className="text-sm font-medium text-gray-300">Cardholder Name</label>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={details.holderName}
                    onChange={(e) => setDetails({...details, holderName: e.target.value})}
                    className={`bg-[#1f2942]/80 border ${
                      fieldErrors.holderName ? 'border-red-500/50' : 'border-white/10 focus:border-[#20DDBB]/50'
                    } text-white py-3 px-4 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30 transition duration-300`}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                    {details.holderName && details.holderName.length >= 3 && !fieldErrors.holderName && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-green-400"
                      >
                        <FaCheck size={14} />
                      </motion.span>
                    )}
                  </div>
                </div>
                {fieldErrors.holderName && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-1 text-xs text-red-400"
                  >
                    {fieldErrors.holderName}
                  </motion.p>
                )}
              </div>

              <div>
                <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/10">
                  <div className="flex items-start gap-2">
                    <FaInfoCircle className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-[#9BA3BF]">
                      Card information is processed securely and is not stored on our servers.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {method === 'paypal' && (
          <div className="mb-4">
            <div className="mb-2 flex justify-between items-center">
              <label className="text-sm font-medium text-gray-300">PayPal Email</label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <FaEnvelope className="text-gray-400" />
              </div>
              <input
                type="email"
                placeholder="your-email@example.com"
                value={details.email}
                onChange={(e) => setDetails({...details, email: e.target.value})}
                className={`bg-[#1f2942]/80 border ${
                  fieldErrors.email ? 'border-red-500/50' : 'border-white/10 focus:border-[#20DDBB]/50'
                } text-white py-3 px-10 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30`}
              />
            </div>
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>
            )}
            <p className="mt-2 text-xs text-[#9BA3BF]">
              Enter the email address associated with your PayPal account
            </p>
          </div>
        )}

        {method === 'bank_transfer' && (
          <>
            <div className="mb-4">
              <div className="mb-2">
                <label className="text-sm font-medium text-gray-300">Bank Name</label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <FaUniversity className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Enter your bank name"
                  value={details.bankName}
                  onChange={(e) => setDetails({...details, bankName: e.target.value})}
                  className={`bg-[#1f2942]/80 border ${
                    fieldErrors.bankName ? 'border-red-500/50' : 'border-white/10 focus:border-[#20DDBB]/50'
                  } text-white py-3 px-10 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30`}
                />
              </div>
              {fieldErrors.bankName && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.bankName}</p>
              )}
            </div>

            <div className="mb-4">
              <div className="mb-2">
                <label className="text-sm font-medium text-gray-300">Account Holder Name</label>
              </div>
              <input
                type="text"
                placeholder="Full name as it appears on your account"
                value={details.holderName}
                onChange={(e) => setDetails({...details, holderName: e.target.value})}
                className={`bg-[#1f2942]/80 border ${
                  fieldErrors.holderName ? 'border-red-500/50' : 'border-white/10 focus:border-[#20DDBB]/50'
                } text-white py-3 px-4 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30`}
              />
              {fieldErrors.holderName && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.holderName}</p>
              )}
            </div>

            <div className="mb-4">
              <div className="mb-2">
                <label className="text-sm font-medium text-gray-300">Account Number</label>
              </div>
              <input
                type="text"
                placeholder="Your bank account number"
                value={details.accountNumber}
                onChange={(e) => setDetails({...details, accountNumber: e.target.value})}
                className={`bg-[#1f2942]/80 border ${
                  fieldErrors.accountNumber ? 'border-red-500/50' : 'border-white/10 focus:border-[#20DDBB]/50'
                } text-white py-3 px-4 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30`}
              />
              {fieldErrors.accountNumber && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.accountNumber}</p>
              )}
            </div>

            <div className="mb-4">
              <div className="mb-2">
                <label className="text-sm font-medium text-gray-300">SWIFT/BIC Code</label>
              </div>
              <input
                type="text"
                placeholder="Bank identification code"
                value={details.swiftBic}
                onChange={(e) => setDetails({...details, swiftBic: e.target.value})}
                className={`bg-[#1f2942]/80 border ${
                  fieldErrors.swiftBic ? 'border-red-500/50' : 'border-white/10 focus:border-[#20DDBB]/50'
                } text-white py-3 px-4 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30`}
              />
              {fieldErrors.swiftBic && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.swiftBic}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="mb-4">
                <div className="mb-2">
                  <label className="text-sm font-medium text-gray-300">IBAN (Optional)</label>
                </div>
                <input
                  type="text"
                  placeholder="International bank account number"
                  value={details.accountIban}
                  onChange={(e) => setDetails({...details, accountIban: e.target.value})}
                  className="bg-[#1f2942]/80 border border-white/10 focus:border-[#20DDBB]/50 text-white py-3 px-4 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30"
                />
              </div>
              
              <div className="mb-4">
                <div className="mb-2">
                  <label className="text-sm font-medium text-gray-300">Routing Number (Optional)</label>
                </div>
                <input
                  type="text"
                  placeholder="For US bank accounts"
                  value={details.routingNumber}
                  onChange={(e) => setDetails({...details, routingNumber: e.target.value})}
                  className="bg-[#1f2942]/80 border border-white/10 focus:border-[#20DDBB]/50 text-white py-3 px-4 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30"
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2">
                <label className="text-sm font-medium text-gray-300">Bank Address (Optional)</label>
              </div>
              <textarea
                placeholder="Full address of your bank branch"
                value={details.bankAddress}
                onChange={(e) => setDetails({...details, bankAddress: e.target.value})}
                className="bg-[#1f2942]/80 border border-white/10 focus:border-[#20DDBB]/50 text-white py-3 px-4 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30 resize-none h-24"
              />
            </div>
          </>
        )}

        {/* Submit button with improved UI */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting || !!amountError}
            className={`
              w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-lg text-white font-medium
              transition-all duration-300 relative overflow-hidden group
              ${isSubmitting || !!amountError
                ? 'bg-gray-600/50 cursor-not-allowed opacity-70'
                : 'bg-gradient-to-r from-[#20DDBB] via-[#f06ef2] to-[#20DDBB] bg-size-200 bg-pos-0 hover:bg-pos-100 hover:shadow-lg hover:shadow-[#20DDBB]/20 active:scale-[0.98] border border-[#20DDBB]/30'
              }
            `}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span className="relative z-10">Request Withdrawal</span>
                <FaArrowRight className="relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-300 rounded-lg"></div>
              </>
            )}
          </button>
        </div>
      </form>
    );
  };

  // Render the success state after withdrawal is completed
  const renderSuccessState = () => {
    return (
      <div
      className="text-center py-8"
    >
      <div className="mb-6 inline-flex p-5 rounded-full bg-[#20DDBB]/10 text-[#20DDBB]">
        <FaWallet className="w-12 h-12" />
      </div>
      
      <h3 className="text-xl font-bold text-white mb-2">Withdrawal Requested</h3>
      <p className="text-gray-400 mb-6 max-w-xs mx-auto">
        Your withdrawal request has been submitted successfully and is now being processed.
      </p>
      
      <div className="mb-6 px-6 py-5 rounded-lg bg-[#1f2942]/60 border border-[#20DDBB]/10 text-left">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-400">Method</span>
          <span className="text-white font-medium capitalize">{method.replace('_', ' ')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Amount</span>
          <span className="text-[#20DDBB] font-semibold">${parseFloat(amount).toFixed(2)}</span>
        </div>
      </div>
      
      <button
        onClick={onClose}
        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg 
          bg-gradient-to-r from-[#20DDBB] via-[#f06ef2] to-[#20DDBB] 
          text-white font-medium hover:shadow-lg hover:shadow-[#20DDBB]/20
          transition-all duration-300 border border-[#20DDBB]/30
          bg-size-200 bg-pos-0 hover:bg-pos-100"
      >
        <span>Close</span>
      </button>
      </div>
  );
  };

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
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="relative bg-[#1A2338]/80 backdrop-blur-xl text-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden z-10 border border-[#3f2d63]/30"
          >
            {/* Close button */}
            <motion.button 
              whileHover={{ backgroundColor: 'rgba(63, 45, 99, 0.5)', scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-white transition-colors z-20"
              aria-label="Close"
            >
              <FaTimes className="w-5 h-5" />
            </motion.button>

            {/* Header */}
            <motion.div 
              className="px-6 py-5 border-b border-[#20DDBB]/30 bg-gradient-to-r from-[#20DDBB]/30 via-[#f06ef2]/20 to-transparent backdrop-blur-md"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-[#20DDBB]/30 to-[#f06ef2]/30 rounded-full flex items-center justify-center shadow-inner backdrop-blur-sm mr-3">
                  <FaMoneyBillWave className="text-[#20DDBB] text-xl animate-floatY" />
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-white to-[#20DDBB] bg-clip-text text-transparent">Withdraw Funds</h2>
              </div>
              <p className="text-[#9BA3BF] text-sm mt-2 pl-[52px]">Transfer your earnings to your preferred payment method</p>
            </motion.div>
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar"
            >
              {/* Show success screen or the form based on operation status */}
              {operationCompleted ? (
                renderSuccessState()
              ) : (
                renderWithdrawalForm()
              )}
            </motion.div>
          </motion.div>
        </div>
      )}
    </>
  );
} 