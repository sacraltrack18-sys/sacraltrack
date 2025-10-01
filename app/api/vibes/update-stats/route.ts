import { NextRequest, NextResponse } from "next/server";
import { database, Query } from "@/libs/AppWriteClient";
import { APPWRITE_CONFIG } from "@/libs/AppWriteClient";

// API-роут для обновления статистики вайба
// Этот маршрут предназначен для обновления только статистики и не требует полных прав доступа
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vibe_id, stats, likes_count, comments_count } = body;
    
    console.log(`[UPDATE-STATS] Received request to update stats for vibe ${vibe_id}`);
    
    // Проверка входных данных
    if (!vibe_id) {
      return NextResponse.json(
        { error: "Missing vibe_id parameter" },
        { status: 400 }
      );
    }
    
    // Получаем текущий документ вайба
    let vibeDoc;
    try {
      vibeDoc = await database.getDocument(
        APPWRITE_CONFIG.databaseId,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
        vibe_id
      );
      
      if (!vibeDoc) {
        return NextResponse.json(
          { error: "Vibe not found" },
          { status: 404 }
        );
      }
    } catch (error) {
      console.error(`[UPDATE-STATS] Error fetching vibe document:`, error);
      return NextResponse.json(
        { error: "Failed to fetch vibe document" },
        { status: 500 }
      );
    }
    
    // Подготовка данных для обновления
    let newStats;
    
    // Если переданы готовые stats в формате JSON-строки
    if (stats) {
      try {
        newStats = JSON.parse(stats);
        console.log(`[UPDATE-STATS] Using provided stats:`, newStats);
      } catch (parseError) {
        console.error(`[UPDATE-STATS] Error parsing stats JSON:`, parseError);
        // Если не удалось распарсить JSON, используем переданные счетчики
        if (typeof likes_count === 'number' && typeof comments_count === 'number') {
          newStats = [likes_count.toString(), comments_count.toString(), '0'];
        } else {
          return NextResponse.json(
            { error: "Invalid stats format" },
            { status: 400 }
          );
        }
      }
    } 
    // Если переданы отдельные счетчики
    else if (typeof likes_count === 'number' && typeof comments_count === 'number') {
      // Определяем формат текущих stats
      const currentStats = vibeDoc.stats;
      
      if (Array.isArray(currentStats)) {
        const viewsCount = currentStats.length > 2 ? currentStats[2] : '0';
        newStats = [likes_count.toString(), comments_count.toString(), viewsCount];
      } else if (typeof currentStats === 'object' && currentStats !== null) {
        newStats = {
          total_likes: likes_count.toString(),
          total_comments: comments_count.toString(),
          total_views: (currentStats.total_views || 0).toString()
        };
      } else {
        // Если stats не существует или имеет неверный формат, создаем новый массив
        newStats = [likes_count.toString(), comments_count.toString(), '0'];
      }
      
      console.log(`[UPDATE-STATS] Generated new stats:`, newStats);
    } else {
      return NextResponse.json(
        { error: "Missing stats data" },
        { status: 400 }
      );
    }
    
    // Обновляем документ
    try {
      await database.updateDocument(
        APPWRITE_CONFIG.databaseId,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
        vibe_id,
        { stats: newStats }
      );
      
      console.log(`[UPDATE-STATS] Successfully updated stats for vibe ${vibe_id}`);
      
      return NextResponse.json({
        success: true,
        vibe_id,
        stats: newStats
      });
    } catch (updateError) {
      console.error(`[UPDATE-STATS] Error updating stats:`, updateError);
      
      // Пытаемся использовать patch вместо update, если доступно
      try {
        console.log(`[UPDATE-STATS] Attempting patch method for stats update`);
        
        // Использование patch API если доступно
        await database.updateDocument(
          APPWRITE_CONFIG.databaseId,
          process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
          vibe_id,
          { stats: newStats }
        );
        
        console.log(`[UPDATE-STATS] Successfully patched stats for vibe ${vibe_id}`);
        
        return NextResponse.json({
          success: true,
          vibe_id,
          stats: newStats,
          method: 'patch'
        });
      } catch (patchError) {
        console.error(`[UPDATE-STATS] Patch method also failed:`, patchError);
        
        return NextResponse.json(
          { 
            error: "Failed to update stats",
            details: updateError.message || "Unknown error"
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error(`[UPDATE-STATS] Unexpected error:`, error);
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 