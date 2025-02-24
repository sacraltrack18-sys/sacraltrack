import { useEffect, useState } from 'react';
import { useUser } from '@/app/context/user';
import { database, Query } from "@/libs/AppWriteClient";
import useCreateBucketUrl from '@/app/hooks/useCreateBucketUrl';

export default function PurchasedTracks() {
  const userContext = useUser();
  const [purchases, setPurchases] = useState([]);

  useEffect(() => {
    const loadPurchases = async () => {
      if (userContext?.user?.id) {
        const response = await database.listDocuments(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_PURCHASES!,
          [Query.equal('user_id', userContext.user.id)]
        );

        setPurchases(response.documents);
      }
    };

    loadPurchases();
  }, [userContext?.user?.id]);

  const handleDownload = async (audioUrl: string, trackName: string) => {
    const response = await fetch(useCreateBucketUrl(audioUrl));
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trackName}.mp3`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-4">
      {purchases.map((purchase: any) => (
        <div key={purchase.$id} className="bg-[#272B43] p-4 rounded-xl flex justify-between items-center">
          <div>
            <h3 className="text-white font-medium">{purchase.trackname}</h3>
            <p className="text-[#818BAC] text-sm">Purchased on {new Date(purchase.purchase_date).toLocaleDateString()}</p>
          </div>
          <button
            onClick={() => handleDownload(purchase.audio_url, purchase.trackname)}
            className="bg-[#20DDBB] text-white px-4 py-2 rounded-lg hover:bg-[#1CB99D]"
          >
            Download
          </button>
        </div>
      ))}
    </div>
  );
} 