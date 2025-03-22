import { NextRequest, NextResponse } from 'next/server';

// Configure the route to use Node.js runtime
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('image') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Convert file to base64 directly without using sharp
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        
        return NextResponse.json({
            data: base64,
            type: file.type || 'image/jpeg'
        });
    } catch (error) {
        console.error('Image processing error:', error);
        return NextResponse.json(
            { error: 'Failed to process image' }, 
            { status: 500 }
        );
    }
} 