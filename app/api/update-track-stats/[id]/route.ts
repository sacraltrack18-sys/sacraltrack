import { NextResponse } from 'next/server';
import { database } from "@/libs/AppWriteClient";
import { APPWRITE_CONFIG } from "@/libs/AppWriteClient";
import { Models } from 'node-appwrite';

// Интерфейс для статистики трека
interface TrackStatsData {
  track_id: string;
  plays_count: string;
  downloads_count: string;
  purchases_count: string;
  likes: string;
  shares: string;
  last_played: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: any; // Для поддержки динамических полей
}

// Временное решение для исправления ошибки типа в Next.js 15
export async function POST(req: Request, context: any) {
  try {
    const trackId = context.params.id;
    
    if (!trackId) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
    }
    
    // Получаем данные из тела запроса
    const { field, value, operation = 'increment' } = await req.json();
    
    if (!field) {
      return NextResponse.json({ error: 'Field name is required' }, { status: 400 });
    }
    
    // Проверяем, что значение является числом
    if (typeof value !== 'number') {
      return NextResponse.json({ error: 'Value must be a number' }, { status: 400 });
    }
    
    // Получаем текущий документ статистики
    let stats: Models.Document;
    
    try {
      stats = await database.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.statisticsCollectionId,
        trackId
      );
    } catch (error: any) {
      // Если документ не найден, создаем новый
      if (error.code === 404) {
        // Базовые данные для нового документа статистики
        const statsData: TrackStatsData = {
          track_id: trackId,
          plays_count: "0",
          downloads_count: "0",
          purchases_count: "0",
          likes: "0",
          shares: "0",
          last_played: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Если операция - increment, устанавливаем начальное значение для указанного поля
        if (operation === 'increment') {
          statsData[field] = value.toString();
        } else {
          statsData[field] = value.toString();
        }
        
        stats = await database.createDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.statisticsCollectionId,
          trackId,
          statsData
        );
        
        return NextResponse.json({ 
          success: true, 
          message: 'Created new statistics document',
          statistics: stats
        });
      } else {
        // Если произошла другая ошибка, возвращаем ее
        return NextResponse.json({ 
          error: 'Failed to fetch track statistics',
          details: error 
        }, { status: 500 });
      }
    }
    
    // Обновляем значение в соответствии с операцией
    let newValue;
    
    if (operation === 'increment') {
      // Преобразуем текущее значение в число, выполняем операцию и затем преобразуем обратно в строку
      const currentValue = parseInt((stats as any)[field] || "0", 10);
      newValue = (currentValue + value).toString();
    } else {
      // Операция 'set' - просто преобразуем в строку
      newValue = value.toString();
    }
    
    // Обновляем документ в базе данных
    const updatedStats = await database.updateDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.statisticsCollectionId,
      trackId,
      {
        [field]: newValue,
        updated_at: new Date().toISOString(),
        last_played: field === 'plays_count' ? new Date().toISOString() : (stats as any).last_played
      }
    );
    
    return NextResponse.json({ 
      success: true, 
      statistics: updatedStats 
    });
    
  } catch (error) {
    console.error('Error in update-track-stats API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error
    }, { status: 500 });
  }
} 