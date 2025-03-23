// Инструкции по обновлению Appwrite для системы друзей

/*
1. Обновить коллекцию друзей (friends)
   Добавить следующие атрибуты:
   - userId (string, required) - ID пользователя, который отправил запрос
   - friendId (string, required) - ID пользователя, которому отправлен запрос
   - status (string, enum: ['pending', 'accepted', 'rejected'], required) - статус запроса
   - createdAt (datetime, required) - дата создания запроса
   - updatedAt (datetime) - дата обновления запроса

2. Добавить индексы для оптимизации запросов:
   - Индекс по userId и status для быстрого поиска всех друзей пользователя
   - Индекс по friendId и status для быстрого поиска всех входящих запросов
   - Уникальный индекс по userId+friendId чтобы предотвратить дублирование запросов

3. Обновить коллекцию профилей пользователей (если необходимо):
   - Добавить рейтинг (rating) - число с плавающей точкой, по умолчанию 0
   - Добавить счетчик оценок (ratingsCount) - целое число, по умолчанию 0
   - friendsCount (number, default: 0) - количество друзей

4. Создать коллекцию для рейтинга пользователей (userRatings):
   - raterId (string, required) - ID пользователя, который поставил оценку
   - userId (string, required) - ID пользователя, которому поставлена оценка
   - rating (number, required) - значение оценки от 0 до 5
   - createdAt (datetime, required) - дата создания оценки
   - updatedAt (datetime) - дата обновления оценки

5. Добавить индексы для коллекции рейтинга:
   - Уникальный индекс по raterId+userId для предотвращения повторных оценок
   - Индекс по userId для быстрого поиска всех оценок пользователя
*/

// Пример кода для обновления профиля с новым рейтингом
async function updateProfileRating(userId, newRating) {
  try {
    // Получить текущий профиль
    const profile = await database.getDocument(
      process.env.NEXT_PUBLIC_DATABASE_ID,
      process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILES,
      userId
    );
    
    // Рассчитать новый средний рейтинг
    const currentRating = profile.rating || 0;
    const ratingsCount = profile.ratingsCount || 0;
    const newAverageRating = (currentRating * ratingsCount + newRating) / (ratingsCount + 1);
    
    // Обновить профиль с новым рейтингом
    await database.updateDocument(
      process.env.NEXT_PUBLIC_DATABASE_ID,
      process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILES,
      userId,
      {
        rating: newAverageRating,
        ratingsCount: ratingsCount + 1
      }
    );
    
    return newAverageRating;
  } catch (error) {
    console.error('Failed to update profile rating:', error);
    throw error;
  }
} 