/**
 * Thoroughly cleans all authentication-related state in the browser
 * Useful for resolving persistent authentication issues
 */
export const clearAllAuthState = () => {
  if (typeof window === 'undefined') {
    console.log('clearAllAuthState: Not in browser environment');
    return false;
  }
  
  try {
    console.log('Cleaning up all authentication state...');
    
    // Clear session storage items related to auth
    sessionStorage.removeItem('googleAuthInProgress');
    sessionStorage.removeItem('appwrite-fallback-session');
    
    // Clear local storage items related to auth
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userAvatar');
    localStorage.removeItem('cache_timestamp');
    
    // Clear all cookies
    document.cookie.split(';').forEach(function(c) {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });
    
    console.log('Authentication state cleanup completed');
    return true;
  } catch (error) {
    console.error('Error clearing authentication state:', error);
    return false;
  }
}; 