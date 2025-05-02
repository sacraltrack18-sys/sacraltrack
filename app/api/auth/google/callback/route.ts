import { NextRequest, NextResponse } from 'next/server';
import { account, client, database, APPWRITE_CONFIG } from '@/libs/AppWriteClient';
import { ID, Query } from 'appwrite';

/**
 * Google OAuth callback handler
 * This route handles the callback from Google OAuth authentication
 * and redirects to the appropriate success or fail page
 */
export async function GET(request: NextRequest) {
  try {
    // Get the URL search parameters
    const searchParams = request.nextUrl.searchParams;
    const error = searchParams.get('error');
    
    // If there's an error parameter, redirect to the failure page
    if (error) {
      console.error('Google auth error:', error);
      return NextResponse.redirect(new URL('/fail', request.url));
    }
    
    try {
      // Verify the user is authenticated after OAuth redirect
      const session = await account.getSession('current');
      
      if (!session) {
        console.error('No session found after Google OAuth');
        return NextResponse.redirect(new URL('/fail', request.url));
      }
      
      // Get the user account
      const user = await account.get();
      
      // Check if this user already has a profile
      const profiles = await database.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.userCollectionId,
        [Query.equal('userId', [user.$id])]
      );
      
      // If no profile exists yet, create one
      if (profiles.total === 0) {
        console.log('Creating new profile for Google user:', user.$id);
        
        // Create a profile with default values
        await database.createDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.userCollectionId,
          ID.unique(),
          {
            userId: user.$id,
            name: user.name,
            bio: '',
            image: '/images/placeholders/user-placeholder.svg'
          }
        );
      }
      
      // Redirect to the success page
      return NextResponse.redirect(new URL('/auth/google/success', request.url));
    } catch (sessionError) {
      console.error('Error verifying session after Google OAuth:', sessionError);
      return NextResponse.redirect(new URL('/fail', request.url));
    }
  } catch (error) {
    console.error('Error in Google auth callback:', error);
    return NextResponse.redirect(new URL('/fail', request.url));
  }
} 