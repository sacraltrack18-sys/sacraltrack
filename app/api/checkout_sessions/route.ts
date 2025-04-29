// app/api/checkout_sessions/route.ts

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { database } from "@/libs/AppWriteClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2023-10-16",
});

export async function OPTIONS(req: Request) {
    // Получаем origin из запроса или используем допустимый URL
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || '*';
    
    // Обрабатываем CORS preflight запрос с динамическим origin
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Origin',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400',
        },
    });
}

export async function POST(req: Request) {
    console.log('Received POST request to checkout_sessions');
    
    // Получаем origin из запроса или используем допустимый URL
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || '*';
    console.log('Request origin:', origin);
    
    // Все необходимые CORS заголовки
    const headers = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Origin',
        'Access-Control-Allow-Credentials': 'true',
    };

    // Проверяем инициализацию Stripe
    if (!stripe) {
        console.error('Stripe is not initialized');
        return NextResponse.json(
            { success: false, error: "Stripe configuration error" },
            { status: 500, headers }
        );
    }

    // Проверка метода запроса
    if (req.method !== 'POST') {
        console.log('Method not allowed:', req.method);
        return NextResponse.json(
            { success: false, error: 'Method not allowed' },
            { status: 405, headers }
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
                { status: 400, headers }
            );
        }

        // Получаем базовый URL для успешного перенаправления
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin || 'https://your-app-domain.com';
        console.log('Using base URL for redirects:', baseUrl);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            metadata: {
                trackId,
                userId,
                authorId,
                amount: amount.toString()
            },
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: trackName,
                            images: image ? [image] : [],
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/cancel`,
            // Выставляем ограничение по времени (30 минут)
            expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        });

        console.log('Checkout session created:', session.id);
        console.log('Session URL:', session.url);
        
        // Проверка URL сессии
        if (!session.url) {
            console.error('Session URL is missing from Stripe response');
            throw new Error('Session URL is missing from Stripe response');
        }
        
        return NextResponse.json({ 
            success: true, 
            session: {
                id: session.id,
                url: session.url
            } 
        }, { headers });
    } catch (error: any) {
        console.error('Checkout session error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500, headers }
        );
    }
}
