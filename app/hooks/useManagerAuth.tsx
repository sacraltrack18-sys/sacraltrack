import { account, database, Query } from '@/libs/AppWriteClient';
import { useState } from 'react';

export const useManagerAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const session = await account.createEmailSession(email, password);
      
      // Проверяем, является ли пользователь менеджером
      const response = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'managers',
        [Query.equal('email', email), Query.equal('status', 'active')]
      );

      if (response.documents.length === 0) {
        await account.deleteSession('current');
        throw new Error('Unauthorized access');
      }

      // Обновляем время последнего входа
      await database.updateDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'managers',
        response.documents[0].$id,
        {
          last_login: new Date().toISOString()
        }
      );

      return response.documents[0];
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Authentication failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return {
    login,
    logout,
    loading,
    error
  };
}; 