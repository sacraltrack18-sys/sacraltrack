import { NextRequest, NextResponse } from 'next/server';

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
    
    // Process successful authentication
    // ... (Here you would normally validate tokens, create/update user, etc.)
    
    // Redirect to the dedicated Google auth success page
    return NextResponse.redirect(new URL('/auth/google/success', request.url));
  } catch (error) {
    console.error('Error in Google auth callback:', error);
    return NextResponse.redirect(new URL('/fail', request.url));
  }
} 