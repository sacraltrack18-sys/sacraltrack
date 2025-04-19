import { NextResponse } from 'next/server';
import { storage } from '@/libs/AppWriteClient';
import { ID } from 'appwrite';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const segment = formData.get('segment') as File;

        if (!segment) {
            return NextResponse.json(
                { error: 'No segment file provided' },
                { status: 400 }
            );
        }
        
        try {
            console.log('Starting segment upload to Appwrite...', {
                fileName: segment.name,
                fileSize: segment.size,
                timestamp: new Date().toISOString()
            });

            // Загружаем сегмент в storage и получаем результат загрузки
            const uploadResult = await storage.createFile(
                process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID!,
                ID.unique(),  // Использовать ID.unique() вместо 'unique()'
                segment
            );

            // Получаем ID, который был автоматически сгенерирован Appwrite
            const segmentId = uploadResult.$id;

            console.log('Segment successfully uploaded to Appwrite', {
                segmentId,
                fileName: segment.name,
                timestamp: new Date().toISOString()
            });

            // Формируем URL для сегмента
            const fileUrl = `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID}/files/${segmentId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;

            // Возвращаем ID сегмента и URL
            return NextResponse.json({ 
                segmentId,
                fileUrl,
                duration: 10 // Предполагаемая длительность сегмента
            });

        } catch (uploadError) {
            console.error('Error uploading segment:', uploadError);
            return NextResponse.json(
                { error: 'Failed to upload segment' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Error processing segment upload:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 
