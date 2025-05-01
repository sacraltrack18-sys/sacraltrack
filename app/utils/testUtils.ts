import { database, ID, account, Query } from '@/libs/AppWriteClient';
import { logAppwriteError } from './errorHandling';

interface AppwriteDocument {
  $id: string;
  [key: string]: any;
}

/**
 * Test utility to validate profile creation
 * This can be run from browser console to test the fix:
 * 
 * import { testProfileCreation } from '@/app/utils/testUtils';
 * testProfileCreation().then(console.log);
 */
export const testProfileCreation = async () => {
  try {
    // 1. Check if logged in first
    try {
      const user = await account.get();
      console.log('Using authenticated user:', user.$id);

      // 2. Try finding existing profile 
      let profile: AppwriteDocument | null = null;
      try {
        const response = await database.listDocuments(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
          [Query.equal('user_id', user.$id)]
        );

        if (response.documents.length > 0) {
          profile = response.documents[0];
          console.log('Found existing profile:', profile.$id);
        }
      } catch (findError) {
        console.warn('Error finding profile:', findError);
      }

      // 3. Create test profile if none exists
      if (!profile) {
        try {
          profile = await database.createDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
            ID.unique(),
            {
              user_id: user.$id,
              name: 'Test User',
              image: '/images/placeholders/user-placeholder.svg',
              bio: 'Test profile for validating fixes',
              total_likes: '0',
              total_followers: '0',
              average_rating: '0',
              total_ratings: '0',
              created_at: new Date().toISOString()
            }
          );
          console.log('Created test profile:', profile.$id);
        } catch (createError) {
          logAppwriteError('testProfileCreation', createError);
          return {
            success: false,
            stage: 'create_profile',
            error: createError
          };
        }
      }

      // 4. Try updating the profile to verify our string conversion works
      if (profile) {
        try {
          const updateResult = await database.updateDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
            profile.$id,
            {
              total_likes: '5',
              updated_at: new Date().toISOString()
            }
          );
          console.log('Updated test profile with likes:', updateResult);
        } catch (updateError) {
          logAppwriteError('testProfileCreation', updateError);
          return {
            success: false,
            stage: 'update_profile',
            error: updateError
          };
        }
      } else {
        return {
          success: false,
          stage: 'profile_missing',
          error: new Error('Failed to create or find profile')
        };
      }

      return {
        success: true,
        profile,
        message: 'Profile created and updated successfully'
      };
    } catch (authError) {
      console.error('Authentication required for testing:', authError);
      return {
        success: false,
        stage: 'authentication',
        error: authError instanceof Error ? authError.message : String(authError)
      };
    }
  } catch (error) {
    logAppwriteError('testProfileCreation', error);
    return {
      success: false,
      stage: 'general',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}; 