"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BsCheckCircle } from "react-icons/bs";
import useCreateRoyaltyPayment from "@/app/hooks/useCreateRoyaltyPayment";
import RoyaltyBalanceCard from "@/app/components/royalty/RoyaltyBalanceCard";
import SoldTracksCard from "@/app/components/royalty/SoldTracksCard";
import TermsOfUseCard from "@/app/components/TermsOfUseCard";
import ClientOnly from "@/app/components/ClientOnly";
import CardForm from "../components/CardForm";
import TopNav from "@/app/layouts/includes/TopNav";
import { useUser } from "@/app/context/user";
import useRoyalty from "@/app/hooks/useRoyalty";
import { RoyaltyTransaction } from "@/app/types";

interface RoyaltyStats {
  totalEarned: number;
  totalTracks: number;
  bestSellingTrack: string;
  recentTransactions: RoyaltyTransaction[];
}

export default function RoyaltyPage() {
    const router = useRouter();
    const [paymentMethod, setPaymentMethod] = useState<"card" | "crypto">("card");
    const [amount, setAmount] = useState<number>(0);
    const { createRoyaltyPayment } = useCreateRoyaltyPayment();
    const userContext = useUser();
    const { getAuthorRoyalties, getRoyaltyBalance } = useRoyalty();
    const [stats, setStats] = useState<RoyaltyStats>({
      totalEarned: 0,
      totalTracks: 0,
      bestSellingTrack: '',
      recentTransactions: []
    });

    useEffect(() => {
      const loadRoyaltyStats = async () => {
        if (!userContext?.user?.id) return;

        try {
          // Получаем все транзакции роялти автора
          const royalties = await getAuthorRoyalties(userContext.user.id);
          
          // Считаем общую сумму заработка
          const totalEarned = royalties.reduce((sum, r) => sum + r.amount, 0);

          // Группируем транзакции по трекам для определения самого продаваемого
          const trackStats = royalties.reduce((acc, r) => {
            acc[r.track_id] = (acc[r.track_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const bestTrackId = Object.entries(trackStats)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

          setStats({
            totalEarned,
            totalTracks: Object.keys(trackStats).length,
            bestSellingTrack: bestTrackId,
            recentTransactions: royalties.slice(0, 5) // Последние 5 транзакций
          });

        } catch (error) {
          console.error('Error loading royalty stats:', error);
        }
      };

      loadRoyaltyStats();
    }, [userContext?.user?.id]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setAmount(value >= 0 ? value : 0); // Устанавливаем значение 0, если введено отрицательное число
  };

  return (
    <ClientOnly>
    <TopNav params={{ id: userContext?.user?.id as string }} />
        <div className="flex justify-left items-center h-screen px-5">
            <div className="bg-[#1A2338] md:mt-[260px] mt-[570px] rounded-2xl p-8 w-full max-w-[800px] flex flex-col md:flex-row gap-8">
                <div className="flex-1">
              <h2 className="text-2xl font-bold mb-4 text-white">Royalty Dashboard</h2>
              
              {/* Статистика */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#272B43] p-4 rounded-lg">
                  <p className="text-[#838383]">Total Earned</p>
                  <p className="text-white text-xl">${stats.totalEarned.toFixed(2)}</p>
                    </div>
                <div className="bg-[#272B43] p-4 rounded-lg">
                  <p className="text-[#838383]">Tracks Sold</p>
                  <p className="text-white text-xl">{stats.totalTracks}</p>
                </div>
              </div>

              {/* Последние транзакции */}
              <div className="mb-6">
                <h3 className="text-white text-lg mb-3">Recent Transactions</h3>
                {stats.recentTransactions.map((transaction) => (
                  <div key={transaction.$id} className="bg-[#272B43] p-3 rounded-lg mb-2">
                    <p className="text-white">${transaction.amount}</p>
                    <p className="text-[#838383] text-sm">
                      {new Date(transaction.transaction_date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>

              {/* Форма вывода средств */}
                <div className="mb-4">
                <label className="block text-white font-medium mb-2">Withdrawal Amount</label>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value))}
                    className="bg-[#272B43] text-white rounded-lg px-4 py-3 w-full focus:outline-none"
                    placeholder="Enter amount"
                /> 
                </div>
               
                <CardForm amount={amount} onSubmit={function (cardDetails: { cardNumber: string; cardExpiry: string; cardCVC: string; firstName: string; lastName: string; }, amount: number): void {
                          throw new Error("Function not implemented.");
                      } } />
            </div>

                <div className="flex-1 absolute top-[80px] right-5 w-[328px] md:max-w-[390px]">
                <RoyaltyBalanceCard />
                <div className="h-5"></div>
                <TermsOfUseCard />
                </div>
            </div>
            </div>
</ClientOnly>
);
}
