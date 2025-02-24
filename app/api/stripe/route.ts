import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { database } from "@/libs/AppWriteClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

export async function POST(req: Request) {
  try {
    const { trackId, trackName, userId, authorId, image } = await req.json();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      metadata: {
        trackId,
        userId,
        authorId
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: trackName,
              images: image ? [image] : [],
            },
            unit_amount: 200, // $2.00
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
    });

    return NextResponse.json({ success: true, sessionId: session.id });
  } catch (error) {
    console.error('Stripe API error:', error);
    return NextResponse.json({ error: 'Payment session creation failed' }, { status: 500 });
  }
} 