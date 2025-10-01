import { NextResponse } from 'next/server';
import { Client, Databases, Query } from 'appwrite';



const ENABLE_COMMENTS = false; // Установите в true, чтобы включить функциональность

export async function GET(
    request: Request,
    { params }: { params: Promise<{ postId: string }> }
) {
    const { postId } = await params;

    if (!postId) {
        return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    try {
        // Удаляем или закомментируем код, связанный с endpoint и replace
        // const endpoint = someVariable; // Замените на вашу переменную
        // const modifiedEndpoint = endpoint.replace('oldValue', 'newValue'); // Удалено

        // Временно возвращаем успешный ответ без комментариев
        return NextResponse.json({ message: 'Comments functionality is temporarily disabled.' });
    } catch (error) {
        console.error('Error fetching comments:', error);
        return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }
} 