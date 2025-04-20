import { NextResponse } from 'next/server';
import { storage } from '@/libs/AppWriteClient';
import { ID } from 'appwrite';

// Set max payload size to 200MB
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '200mb',
    },
    responseLimit: false,
  },
};

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

            // Get bucket ID from env vars - check both possible variable names
            const bucketId = process.env.NEXT_PUBLIC_BUCKET_ID || process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID;
            
            if (!bucketId) {
                console.error('Missing bucket ID configuration');
                return NextResponse.json(
                    { error: 'Missing storage configuration', details: 'Bucket ID not found in environment variables' },
                    { status: 500 }
                );
            }

            console.log('Using bucket ID:', bucketId);

            // Загружаем сегмент в storage и получаем результат загрузки
            const uploadResult = await storage.createFile(
                bucketId,
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

            // Формируем URL для сегмента - using the correct project ID variable
            const projectId = process.env.NEXT_PUBLIC_ENDPOINT;
            const fileUrl = `${process.env.NEXT_PUBLIC_APPWRITE_URL}/storage/buckets/${bucketId}/files/${segmentId}/view?project=${projectId}`;

            // Возвращаем ID сегмента и URL
            return NextResponse.json({ 
                segmentId,
                fileUrl,
                duration: 10 // Предполагаемая длительность сегмента
            });

        } catch (uploadError: any) {
            console.error('Error uploading segment:', uploadError);
            return NextResponse.json(
                { 
                    error: 'Failed to upload segment', 
                    details: uploadError?.message || JSON.stringify(uploadError)
                },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error('Error processing segment upload:', error);
        return NextResponse.json(
            { 
                error: 'Internal server error', 
                details: error?.message || JSON.stringify(error)
            },
            { status: 500 }
        );
    }
} 
