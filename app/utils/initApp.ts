/**
 * App Initialization Utility
 * 
 * This utility handles various initialization tasks for the application,
 * including disabling console logs.
 */

import disableConsoleLogs from './disableConsoleLog';

/**
 * Initialize the application with various configurations
 */
export const initializeApp = () => {
  // Only run on the client-side
  if (typeof window !== 'undefined') {
    // Disable console logs
    disableConsoleLogs();
    
    // Add any other initialization logic here
    // For example:
    // - Setting up global error handlers
    // - Initializing analytics
    // - Loading preferences
  }
};

// Auto-initialize when imported
initializeApp();

export default initializeApp; 