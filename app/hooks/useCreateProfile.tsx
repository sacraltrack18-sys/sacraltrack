import { database, ID } from "@/libs/AppWriteClient"

const useCreateProfile = async (userId: string, name: string, image: string, bio: string) => {
    try {
        // Логируем информацию перед созданием профиля
        console.log('[CREATE_PROFILE] Attempting to create profile with params:', {
            userId,
            name,
            image: typeof image === 'string' ? (image.length > 30 ? image.substring(0, 30) + '...' : image) : 'invalid',
            database_id: process.env.NEXT_PUBLIC_DATABASE_ID,
            collection_id: process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE
        });

        // Проверка входных параметров
        if (!userId || !name) {
            console.error('[CREATE_PROFILE] Missing required fields:', { userId, name });
            throw new Error('Missing required fields for profile creation');
        }

        // Проверка наличия переменных окружения
        if (!process.env.NEXT_PUBLIC_DATABASE_ID || !process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE) {
            console.error('[CREATE_PROFILE] Missing environment variables:', {
                database: process.env.NEXT_PUBLIC_DATABASE_ID ? 'OK' : 'MISSING',
                collection: process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE ? 'OK' : 'MISSING'
            });
            throw new Error('Missing database configuration');
        }

        // Используем дефолтное изображение, если не указано
        const profileImage = image || '/images/placeholders/user-placeholder.svg';

        // Создаем документ профиля
        const result = await database.createDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID,
            process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE,
            ID.unique(),
            {
                user_id: userId,
                name: name,
                image: profileImage,
                bio: bio || '',
                // Add statistical fields as strings
                total_likes: '0',
                total_followers: '0',
                average_rating: '0',
                total_ratings: '0',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        );

        console.log('[CREATE_PROFILE] Profile created successfully:', result.$id);
        return result;
    } catch (error: any) {
        console.error('[CREATE_PROFILE] Error creating profile:', error);
        
        // Логируем детали ошибки
        if (error.response) {
            console.error('[CREATE_PROFILE] Response details:', error.response);
        }
        
        console.error('[CREATE_PROFILE] Error details:', {
            code: error.code,
            message: error.message,
            type: error.type
        });
        
        // Адаптируем сообщение об ошибке для пользователя
        let errorMessage = 'Failed to create user profile';
        
        if (error.message?.includes('Missing required permission')) {
            errorMessage = 'Permission denied while creating profile';
        } else if (error.code === 409) {
            errorMessage = 'A profile for this user already exists';
        } else if (error.code === 400) {
            errorMessage = 'Invalid profile data provided';
        } else if (error.code === 503) {
            errorMessage = 'Database service unavailable';
        }
        
        throw new Error(errorMessage + ': ' + error.message);
    }
}

export default useCreateProfile