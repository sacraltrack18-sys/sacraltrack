import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2023-10-16",
});

// Функция для создания CORS заголовков
function createCorsHeaders(origin: string = '*') {
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Origin, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true'
    };
}

export async function OPTIONS(req: Request) {
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || '*';
    
    const headers = {
        ...createCorsHeaders(origin),
        'Access-Control-Max-Age': '86400'
    };
    
    return new NextResponse(null, {
        status: 204,
        headers
    });
}

export async function GET(req: Request) {
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || '*';
    const corsHeaders = createCorsHeaders(origin);
    
    try {
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('session_id');

        if (!sessionId) {
            return NextResponse.json(
                { success: false, error: "Session ID is required" },
                { status: 400, headers: corsHeaders }
            );
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (!session.url) {
            return NextResponse.json(
                { success: false, error: "Session URL not available" },
                { status: 400, headers: corsHeaders }
            );
        }

        return NextResponse.json({
            success: true,
            session: {
                id: session.id,
                url: session.url,
                status: session.status
            }
        }, { headers: corsHeaders });
    } catch (error: any) {
        console.error('Error retrieving checkout session:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500, headers: corsHeaders }
        );
    }
} 