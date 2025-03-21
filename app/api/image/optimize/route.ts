import { NextRequest } from 'next/server';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('image') as File;

        if (!file) {
            return new Response(JSON.stringify({ error: 'No file provided' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Оптимизируем изображение
        const optimizedBuffer = await sharp(buffer)
            .resize(800, null, { // максимальная ширина 800px, высота пропорциональная
                withoutEnlargement: true,
                fit: 'inside'
            })
            .jpeg({ quality: 80 }) // конвертируем в JPEG с качеством 80%
            .toBuffer();

        return new Response(JSON.stringify({
            data: optimizedBuffer.toString('base64'),
            type: 'image/jpeg'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Image optimization error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to optimize image' }), 
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
} 