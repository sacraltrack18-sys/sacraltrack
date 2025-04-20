import { NextRequest, NextResponse } from 'next/server';
import { Client, ID, Storage } from 'appwrite';

// Указание безопасного runtime без учета зависимостей вроде sharp
export const runtime = 'edge';

// Set max payload size to 200MB
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '200mb',
    },
    responseLimit: false,
  },
};

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

        try {
            // Возвращаем временный ответ с данными файла - так мы обойдём проблему с Appwrite в Edge runtime
            return NextResponse.json({
                success: true,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                // Здесь мы возвращаем временный ID, который будет использован на клиенте
                tempId: Math.random().toString(36).substring(2, 15),
                message: 'Use client-side upload for Appwrite instead'
            });
        } catch (error) {
            console.error('Error processing upload:', error);
            return NextResponse.json(
                { 
                    error: 'Failed to process upload request', 
                    details: error instanceof Error ? error.message : String(error)
                },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Error processing request:', error);
        return NextResponse.json(
            { 
                error: 'Internal server error', 
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
} 