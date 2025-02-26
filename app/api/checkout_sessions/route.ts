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
    console.log('Initializing Stripe with secret key');
    return new Stripe(stripeSecretKey, {
        apiVersion: "2023-10-16",
        typescript: true,
    });
};

// Создаем инстанс Stripe
let stripe: Stripe;
try {
    stripe = initStripe();
    console.log('Stripe initialized successfully');
} catch (error) {
    console.error('Failed to initialize Stripe:', error);
}

export async function POST(req: Request) {
    // Проверяем инициализацию Stripe
    if (!stripe) {
        console.error('Stripe is not initialized');
        return NextResponse.json(
            { success: false, error: "Stripe configuration error" },
            { status: 500 }
        );
    }

    // Проверка метода запроса
    if (req.method !== 'POST') {
        console.log('Method not allowed:', req.method);
        return NextResponse.json(
            { success: false, error: 'Method not allowed' },
            { status: 405 }
        );
    }

    try {
        const body = await req.json();
        console.log('Request body:', body);
        const { trackId, trackName, userId, authorId, image } = body;

        if (!trackId || !trackName || !userId || !authorId) {
            console.error('Missing required parameters');
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

        console.log('Checkout session created:', session);
        return NextResponse.json({ success: true, session });
    } catch (error: any) {
        console.error('Checkout session error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
