// app/api/checkout_sessions/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { database } from "@/libs/AppWriteClient";

// Инициализация Stripe с проверкой ключа
const initStripe = () => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
        console.error('Missing STRIPE_SECRET_KEY environment variable');
        throw new Error('Stripe configuration error');
    }
    return new Stripe(stripeSecretKey, {
        apiVersion: "2023-10-16",
        typescript: true,
    });
};

// Создаем инстанс Stripe
let stripe: Stripe;
try {
    stripe = initStripe();
} catch (error) {
    console.error('Failed to initialize Stripe:', error);
}

export async function POST(req: Request) {
    // Проверяем инициализацию Stripe
    if (!stripe) {
        return NextResponse.json(
            { success: false, error: "Stripe configuration error" },
            { status: 500 }
        );
    }

    // Проверка метода запроса
    if (req.method !== 'POST') {
        return NextResponse.json(
            { success: false, error: 'Method not allowed' },
            { status: 405 }
        );
  }

  try {
        const body = await req.json();
        const { trackId, trackName, userId, authorId, image, audio } = body;

        if (!trackId || !trackName || !userId || !authorId) {
            return NextResponse.json(
                { success: false, error: "Missing required parameters" },
                { status: 400 }
            );
        }

      const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            metadata: {
                trackId,
                authorId,
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

        return NextResponse.json({ success: true, session });
    } catch (error: any) {
        console.error('Checkout session error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
  }
}
