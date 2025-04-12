import { NextRequest, NextResponse } from "next/server";
import { database, ID, Query, Permission, Role } from "@/libs/AppWriteClient";
import { APPWRITE_CONFIG } from "@/libs/AppWriteClient";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, vibe_id, text } = body;

    if (!user_id || !vibe_id || !text) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Создаем новый комментарий
    const currentDate = new Date();
    const newComment = await database.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.vibeCommentsCollectionId, // ID коллекции vibe_comments
      ID.unique(),
      {
        user_id: user_id,
        vibe_id: vibe_id,
        text: text,
        created_at: currentDate.toISOString()
      }
    );

    // Получаем обновленное количество комментариев
    const commentsCount = await getCommentsCount(vibe_id);

    return NextResponse.json({
      success: true,
      comment: {
        id: newComment.$id,
        user_id: user_id,
        vibe_id: vibe_id,
        text: text,
        created_at: currentDate.toISOString()
      },
      count: commentsCount
    });

  } catch (error: any) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create comment" },
      { status: 500 }
    );
  }
}

// Функция для получения списка комментариев для вайба
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const vibe_id = url.searchParams.get("vibe_id");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    if (!vibe_id) {
      return NextResponse.json(
        { error: "Missing vibe_id parameter" },
        { status: 400 }
      );
    }

    // Получаем комментарии для указанного вайба
    const commentsData = await database.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.vibeCommentsCollectionId, // ID коллекции vibe_comments
      [
        Query.equal("vibe_id", vibe_id),
        Query.orderDesc("created_at"),
        Query.limit(limit),
        Query.offset(offset)
      ]
    );

    // Получаем общее количество комментариев
    const totalCount = await getCommentsCount(vibe_id);

    return NextResponse.json({
      comments: commentsData.documents,
      total: totalCount,
      offset: offset,
      limit: limit
    });

  } catch (error: any) {
    console.error("Error getting comments:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get comments" },
      { status: 500 }
    );
  }
}

// Функция для получения количества комментариев для вайба
async function getCommentsCount(vibe_id: string): Promise<number> {
  try {
    const commentsData = await database.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.vibeCommentsCollectionId, // ID коллекции vibe_comments
      [
        Query.equal("vibe_id", vibe_id)
      ]
    );
    
    return commentsData.total;
  } catch (error) {
    console.error("Error counting comments:", error);
    return 0;
  }
}

// Обработчик для удаления комментария
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const comment_id = url.searchParams.get("comment_id");
    const user_id = url.searchParams.get("user_id");
    const vibe_id = url.searchParams.get("vibe_id");

    if (!comment_id || !user_id || !vibe_id) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Проверяем, принадлежит ли комментарий пользователю
    const commentData = await database.getDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.vibeCommentsCollectionId, // ID коллекции vibe_comments
      comment_id
    );

    if (commentData.user_id !== user_id) {
      return NextResponse.json(
        { error: "You don't have permission to delete this comment" },
        { status: 403 }
      );
    }

    // Удаляем комментарий
    await database.deleteDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.vibeCommentsCollectionId, // ID коллекции vibe_comments
      comment_id
    );

    // Получаем обновленное количество комментариев
    const commentsCount = await getCommentsCount(vibe_id);

    return NextResponse.json({
      success: true,
      message: "Comment deleted successfully",
      count: commentsCount
    });

  } catch (error: any) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete comment" },
      { status: 500 }
    );
  }
} 