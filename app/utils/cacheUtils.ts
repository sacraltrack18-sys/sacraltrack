/**
 * Утилиты для работы с кэшем приложения
 */

/**
 * Очищает кэш данных, связанных с пользователем
 * Удаляет все ключи localStorage, относящиеся к трекам, постам, и другим данным пользователя
 */
export function clearUserCache(): void {
  try {
    console.log('Начало очистки кэша данных пользователя...');
    const keysToRemove = [];
    
    // Перебираем все ключи в localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        // Ищем ключи, связанные с треками и постами пользователя
        if (
          key.includes('post') || 
          key.includes('Post') || 
          key.includes('track') || 
          key.includes('Track') ||
          key.includes('liked') ||
          key.includes('paid') ||
          key.includes('profileStore') ||
          key.includes('player') ||
          key.includes('downloads')
        ) {
          keysToRemove.push(key);
        }
      }
    }
    
    // Удаляем найденные ключи
    keysToRemove.forEach(key => {
      console.log('Очистка кэша:', key);
      localStorage.removeItem(key);
    });
    
    console.log(`Успешно очищено ${keysToRemove.length} ключей кэша`);
  } catch (error) {
    console.error('Ошибка при очистке кэша:', error);
  }
} 