import { NextResponse } from "next/server";
import Stripe from "stripe";
import { database, ID } from "@/libs/AppWriteClient";
import { NOTIFICATION_MESSAGES } from '@/app/hooks/useNotifications';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')!;
  const body = await req.text();

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const { trackId, userId, authorId } = session.metadata!;

      if (!session.amount_total) {
        throw new Error('Amount total is missing from the session');
      }
      
      const amount = session.amount_total / 100;

      try {
        // 1. Создаем запись о покупке
      const purchase = await database.createDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_PURCHASES!,
        ID.unique(),
        {
          user_id: userId,
          track_id: trackId,
          author_id: authorId,
          purchase_date: new Date().toISOString(),
            amount: amount.toString(),
            session_id: session.id,
            status: 'completed'
        }
      );

        // 2. Создаем запись роялти (50% от суммы покупки)
        const royaltyAmount = (amount / 2).toString();
      await database.createDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY!,
        ID.unique(),
        {
          author_id: authorId,
          track_id: trackId,
          amount: royaltyAmount,
          transaction_date: new Date().toISOString(),
          purchase_id: purchase.$id,
          status: 'pending',
          user_id: userId,
          purchase_amount: amount.toString(),
          royalty_percentage: "50",
          currency: "USD",
          payment_method: "stripe",
          stripe_session_id: session.id,
          related_purchase_id: purchase.$id,
          metadata_json: "{}"
        }
      );

        // 3. Обновляем общий баланс роялти автора
        try {
          const authorRoyaltyResponse = await database.listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
            []
          );

          const existingBalance = authorRoyaltyResponse.documents.find(
            doc => doc.author_id === authorId
          );

          if (existingBalance) {
            // Обновляем существующий баланс
            const newBalance = (parseFloat(existingBalance.balance) + parseFloat(royaltyAmount)).toString();
            await database.updateDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
              existingBalance.$id,
              {
                balance: newBalance,
                last_updated: new Date().toISOString()
              }
            );
          } else {
            // Создаем новый баланс для автора
            await database.createDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE!,
              ID.unique(),
              {
                author_id: authorId,
                balance: royaltyAmount,
                total_earned: royaltyAmount,
                last_updated: new Date().toISOString(),
                currency: "USD"
              }
            );
          }

        } catch (error) {
          console.error('Error updating royalty balance or creating notifications:', error);
        }

        // Get track name for notifications
        const track = await database.getDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_POST!,
          trackId
        );

        const buyer = await database.getDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
          userId
        );

        // Notification for the author (sale + royalty)
        await database.createDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_NOTIFICATIONS!,
          ID.unique(),
          {
            user_id: authorId,
            type: 'sale',
            title: NOTIFICATION_MESSAGES.sale(buyer.name || 'Someone', track.trackname || 'Unknown Track').title,
            message: NOTIFICATION_MESSAGES.sale(buyer.name || 'Someone', track.trackname || 'Unknown Track').message,
            amount: amount.toString(),
            track_id: trackId,
            created_at: new Date().toISOString(),
            read: false
          }
        );

        await database.createDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_NOTIFICATIONS!,
          ID.unique(),
          {
            user_id: authorId,
            type: 'royalty',
            title: NOTIFICATION_MESSAGES.royalty(royaltyAmount, track.trackname || 'Unknown Track').title,
            message: NOTIFICATION_MESSAGES.royalty(royaltyAmount, track.trackname || 'Unknown Track').message,
            amount: royaltyAmount,
            track_id: trackId,
            created_at: new Date().toISOString(),
            read: false
          }
        );

        // Notification for the buyer
        await database.createDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_NOTIFICATIONS!,
          ID.unique(),
          {
            user_id: userId,
            type: 'purchase',
            title: NOTIFICATION_MESSAGES.purchase(track.trackname || 'Unknown Track').title,
            message: NOTIFICATION_MESSAGES.purchase(track.trackname || 'Unknown Track').message,
            amount: amount.toString(),
            track_id: trackId,
            created_at: new Date().toISOString(),
            read: false
          }
        );

      } catch (error) {
        console.error('Error creating purchase or royalty record:', error);
        throw error;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
} 