import { useEffect, useState } from 'react';
import { useUser } from '@/app/context/user';
import useRoyalty from '@/app/hooks/useRoyalty';

export default function RoyaltyStats() {
  const userContext = useUser();
  const { getAuthorRoyalties, getRoyaltyBalance } = useRoyalty();
  const [totalRoyalty, setTotalRoyalty] = useState(0);
  const [withdrawnAmount, setWithdrawnAmount] = useState(0);
  const [availableAmount, setAvailableAmount] = useState(0);

  useEffect(() => {
    const loadRoyaltyData = async () => {
      if (userContext?.user?.id) {
        const royalties = await getAuthorRoyalties(userContext.user.id);
        const total = await getRoyaltyBalance(userContext.user.id);
        
        const withdrawn = royalties
          .filter(r => r.status === 'withdrawn')
          .reduce((sum, r) => sum + parseFloat(r.amount), 0);

        setTotalRoyalty(total);
        setWithdrawnAmount(withdrawn);
        setAvailableAmount(total - withdrawn);
      }
    };

    loadRoyaltyData();
  }, [userContext?.user?.id]);

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-[#272B43] p-4 rounded-xl">
        <h3 className="text-[#818BAC] text-sm mb-2">Total Royalties</h3>
        <p className="text-white text-2xl font-bold">${totalRoyalty.toFixed(2)}</p>
      </div>
      
      <div className="bg-[#272B43] p-4 rounded-xl">
        <h3 className="text-[#818BAC] text-sm mb-2">Withdrawn</h3>
        <p className="text-white text-2xl font-bold">${withdrawnAmount.toFixed(2)}</p>
      </div>

      <div className="bg-[#272B43] p-4 rounded-xl">
        <h3 className="text-[#818BAC] text-sm mb-2">Available</h3>
        <p className="text-white text-2xl font-bold">${availableAmount.toFixed(2)}</p>
      </div>
    </div>
  );
} 