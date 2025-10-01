// app/api/checkout_sessions/route.ts

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { database } from "@/libs/AppWriteClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2023-10-16",
});

// Функция для создания CORS заголовков - принимаем все источники в разработке
function createCorsHeaders(origin: string = '*') {
    // Всегда принимаем все заголовки для максимальной совместимости
    return {
        'Access-Control-Allow-Origin': '*',  // Allow all origins
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*', // Allow all headers
        'Access-Control-Allow-Credentials': 'true'
    };
}

export async function OPTIONS(req: Request) {
    // Разрешаем все preflight запросы
    const headers = {
        ...createCorsHeaders(),
        'Access-Control-Max-Age': '86400'
    };
    
    return new NextResponse(null, {
        status: 204,
        headers
    });
}

export async function POST(req: Request) {
    console.log('Received POST request to checkout_sessions');
    
    // Устанавливаем CORS заголовки для любых источников
    const corsHeaders = createCorsHeaders();
    
    try {
        const body = await req.json();
        console.log('Request body:', body);
        const { trackId, trackName, userId, authorId, image, amount, redirect_mode } = body;

        if (!trackId || !trackName || !userId || !authorId) {
            console.error('Missing required parameters');
            return NextResponse.json(
                { success: false, error: "Missing required parameters" },
                { status: 400, headers: corsHeaders }
            );
        }

        // Всегда используем полный домен для production
        // Это самый надежный способ избежать проблем с URL
        const baseUrl = 'https://sacraltrack.space';
        console.log('Using fixed base URL for redirects:', baseUrl);

        try {
            // Определяем URLs для успеха и отмены
            const successUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = `${baseUrl}/cancel`;
            
            console.log('Success URL:', successUrl);
            console.log('Cancel URL:', cancelUrl);
            
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
                success_url: successUrl,
                cancel_url: cancelUrl,
                expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
            });

            console.log('Checkout session created:', session.id);
            console.log('Session URL:', session.url);
            
            if (!session.url) {
                throw new Error('Session URL is missing from Stripe response');
            }
            
            return NextResponse.json({ 
                success: true, 
                session: {
                    id: session.id,
                    url: session.url
                } 
            }, { headers: corsHeaders });
            
        } catch (stripeError: any) {
            console.error('Stripe error:', stripeError);
            return NextResponse.json(
                { success: false, error: stripeError.message },
                { status: 500, headers: corsHeaders }
            );
        }
    } catch (error: any) {
        console.error('Checkout session error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500, headers: corsHeaders }
        );
    }
}
