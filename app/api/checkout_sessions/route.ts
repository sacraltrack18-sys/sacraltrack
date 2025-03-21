// app/api/checkout_sessions/route.ts

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { database } from "@/libs/AppWriteClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2023-10-16",
});

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
        const { trackId, trackName, userId, authorId, image, amount } = body;

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
                amount: amount.toString() // Сохраняем сумму в метаданных
            },
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: trackName,
                            images: image ? [image] : [],
                        },
                        unit_amount: amount, // Используем переданную сумму
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
