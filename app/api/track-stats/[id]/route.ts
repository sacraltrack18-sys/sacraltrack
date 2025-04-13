import { NextResponse } from 'next/server';
import { database } from "@/libs/AppWriteClient";
import { APPWRITE_CONFIG } from "@/libs/AppWriteClient";

// Временное решение для исправления ошибки типа в Next.js 15
export async function GET(req: Request, context: any) {
  try {
    const trackId = context.params.id;
    
    if (!trackId) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
    }
    
    // Получаем статистику трека из базы данных
    try {
      const stats = await database.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.statisticsCollectionId,
        trackId
      );
      
      return NextResponse.json({ 
        success: true, 
        statistics: stats 
      });
      
    } catch (error: any) {
      console.error('Error fetching track statistics:', error);
      
      // Если документ не найден, создаем новый документ статистики
      if (error.code === 404) {
        // Создаем документ статистики с ID трека в качестве ID документа
        const statsData = {
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
        
        try {
          const newStats = await database.createDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.statisticsCollectionId,
            trackId, // Используем ID трека как ID документа
            statsData
          );
          
          return NextResponse.json({ 
            success: true, 
            statistics: newStats,
            message: 'Created new statistics document'
          });
        } catch (createError) {
          console.error('Error creating statistics document:', createError);
          return NextResponse.json({ 
            error: 'Failed to create statistics document',
            details: createError 
          }, { status: 500 });
        }
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch track statistics',
        details: error
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error in track-stats API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 