// RoyaltyPaymentCard.tsx
import React, { useState, useEffect } from 'react';
import { BsCheckCircle, BsXCircle, BsCreditCard2Front } from 'react-icons/bs';
import { RoyaltyPayment } from '@/app/types';
import { motion } from 'framer-motion';

interface RoyaltyPaymentCardProps {
  payment: RoyaltyPayment;
  onMarkAsPaid: (paymentId: string, amount: number, userId: string) => void;
  onReject: (paymentId: string) => void;
  isPaymentMarkedAsPaid: boolean;
}

const RoyaltyPaymentCard: React.FC<RoyaltyPaymentCardProps> = ({
  payment,
  onMarkAsPaid,
  onReject,
  isPaymentMarkedAsPaid,
}) => {
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  const handleMarkAsPaid = () => {
    onMarkAsPaid(payment.id, parseFloat(payment.amount), payment.user_id);
    setIsButtonDisabled(true);
  };

  const handleReject = () => {
    onReject(payment.id);
  };

  useEffect(() => {
    setIsButtonDisabled(isPaymentMarkedAsPaid);
  }, [isPaymentMarkedAsPaid]);

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="bg-gradient-to-br from-[#1A2338] to-[#1A2338]/95 rounded-xl overflow-hidden border border-[#20DDBB]/5 transition-all duration-300"
    >
      <div className="p-5 flex justify-between items-center relative">
        {/* Очень тонкая декоративная линия сверху */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#20DDBB]/40 via-[#20DDBB]/20 to-transparent"></div>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#20DDBB]/5">
              <BsCreditCard2Front className="text-[#20DDBB]" />
            </div>
            <h3 className="text-white font-semibold">{payment.user_name}</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <p className="text-[#9BA3BF]">Payment ID</p>
              <p className="text-white/90 font-medium">{payment.id.substring(0, 10)}...</p>
            </div>
            <div>
              <p className="text-[#9BA3BF]">Amount</p>
              <p className="text-[#20DDBB] font-semibold">${payment.amount}</p>
            </div>
            <div>
              <p className="text-[#9BA3BF]">Card</p>
              <p className="text-white/90 font-medium">•••• {payment.card.slice(-4)}</p>
            </div>
            <div>
              <p className="text-[#9BA3BF]">Card Holder</p>
              <p className="text-white/90 font-medium">{payment.card_name}</p>
            </div>
            <div>
              <p className="text-[#9BA3BF]">Expiry</p>
              <p className="text-white/90 font-medium">{payment.card_date}</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`bg-gradient-to-r from-[#20DDBB]/90 to-[#20DDBB]/80 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-1.5 ${
              isPaymentMarkedAsPaid ? 'opacity-50 saturate-50 cursor-not-allowed' : ''
            }`}
            onClick={() => onMarkAsPaid(payment.id, parseFloat(payment.amount), payment.user_id)}
            disabled={isPaymentMarkedAsPaid}
          >
            <BsCheckCircle /> 
            <span>Paid</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="bg-[#1f2942] border border-red-500/10 text-red-400 rounded-lg px-4 py-2 flex items-center gap-1.5"
            onClick={() => onReject(payment.id)}
          >
            <BsXCircle /> 
            <span>Reject</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default RoyaltyPaymentCard;

