import { account, database, ID } from '@/libs/AppWriteClient';

async function createManager(email: string, password: string, name: string) {
  try {
    // Создаем пользователя
    const user = await account.create(
      ID.unique(),
      email,
      password,
      name
    );

    // Создаем запись менеджера
    await database.createDocument(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      'managers',
      user.$id,
      {
        username: email,
        name: name,
        email: email,
        status: 'active',
        created_at: new Date().toISOString(),
        last_login: null
      }
    );

    console.log('Manager created successfully:', user.$id);
  } catch (error) {
    console.error('Error creating manager:', error);
  }
}

// Пример использования:
// createManager('manager@example.com', 'secure_password', 'Admin Manager'); 