import { NextResponse } from "next/server";
import Stripe from "stripe";
import { database, ID } from "@/libs/AppWriteClient";

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

      // Создаем запись о покупке
      const purchase = await database.createDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_PURCHASES!,
        ID.unique(),
        {
          user_id: userId,
          track_id: trackId,
          author_id: authorId,
          purchase_date: new Date().toISOString(),
          amount: "2.00" // $2.00
        }
      );

      // Создаем запись о роялти (50% от стоимости)
      await database.createDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY!,
        ID.unique(),
        {
          author_id: authorId,
          track_id: trackId,
          amount: "1.00", // $1.00 (50% от $2.00)
          transaction_date: new Date().toISOString(),
          purchase_id: purchase.$id,
          status: 'pending'
        }
      );
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