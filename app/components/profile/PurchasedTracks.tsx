import { useEffect, useState } from 'react';
import { useUser } from '@/app/context/user';
import { database, Query } from "@/libs/AppWriteClient";
import useCreateBucketUrl from '@/app/hooks/useCreateBucketUrl';

// Define the Purchase interface
interface Purchase {
  $id: string;
  user_id: string;
  track_id: string;
  author_id: string;
  purchase_date: string;
  amount: string;
  trackname?: string; // Add any other fields you expect
  audio_url?: string; // Add any other fields you expect
}

export default function PurchasedTracks() {
  const userContext = useUser();
  const [purchases, setPurchases] = useState<Purchase[]>([]); // Specify the type here

  useEffect(() => {
    const fetchPurchases = async () => {
      if (userContext?.user?.id) {
        const response = await database.listDocuments(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_PURCHASES!,
          [Query.equal('user_id', userContext.user.id)]
        );

        const purchases = response.documents; // Assuming this is of type Document[]

        // Map to create an array of Purchase
        const purchaseData: Purchase[] = purchases.map(doc => ({
          $id: doc.$id,
          user_id: doc.user_id,
          track_id: doc.track_id,
          author_id: doc.author_id,
          purchase_date: doc.purchase_date,
          amount: doc.amount,
          // Add any other properties as needed
        }));

        setPurchases(purchaseData); // Now this is of type Purchase[]
      }
    };

    fetchPurchases();
  }, [userContext?.user?.id]);

  const handleDownload = async (audioUrl: string | undefined, trackName: string | undefined) => {
    if (!audioUrl || !trackName) {
        console.error('Audio URL or track name is undefined');
        return; // Exit the function if either value is undefined
    }

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
      {purchases.map((purchase) => (
        <div key={purchase.$id} className="bg-[#272B43] p-4 rounded-xl flex justify-between items-center">
          <div>
            <h3 className="text-white font-medium">{purchase.trackname || 'Track Name'}</h3>
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