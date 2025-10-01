"use client";

import { useState, useEffect } from 'react';
import { database, client } from "@/libs/AppWriteClient";
import { useUser } from "@/app/context/user";

interface PurchaseNotification {
  buyer: {
    id: string;
    name: string;
    image: string;
  };
  track: {
    name: string;
    amount: string;
  };
  timestamp: string;
}

export const usePurchaseNotifications = () => {
  const [notifications, setNotifications] = useState<PurchaseNotification[]>([]);
  const [currentNotification, setCurrentNotification] = useState<PurchaseNotification | null>(null);
  const userContext = useUser();

  useEffect(() => {
    if (!userContext?.user?.id) return;

    // Subscribe to realtime updates using the client
    const unsubscribe = client.subscribe(
      `databases.${process.env.NEXT_PUBLIC_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY}.documents`,
      (response: any) => {
        if (response.events.includes('databases.*.collections.*.documents.*.create')) {
          const newTransaction = response.payload;

          if (userContext?.user && newTransaction.author_id === userContext.user.id) {
            // Fetch buyer info
            database.getDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
              newTransaction.buyer_id
            ).then((buyerProfile) => {
              const notification: PurchaseNotification = {
                buyer: {
                  id: newTransaction.buyer_id,
                  name: buyerProfile.name || 'Anonymous',
                  image: buyerProfile.image || '/images/placeholder-user.jpg'
                },
                track: {
                  name: newTransaction.track_name || 'Track',
                  amount: newTransaction.amount
                },
                timestamp: new Date().toISOString()
              };

              setNotifications(prev => [notification, ...prev]);
              setCurrentNotification(notification);

              // Play notification sound
              const audio = new Audio('/sounds/notification.mp3');
              audio.play().catch(console.error);

              // Auto-hide notification after 5 seconds
              setTimeout(() => {
                setCurrentNotification(null);
              }, 5000);
            });
          }
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userContext?.user?.id]);

  const dismissNotification = () => {
    setCurrentNotification(null);
  };

  return {
    notifications,
    currentNotification,
    dismissNotification
  };
}; 