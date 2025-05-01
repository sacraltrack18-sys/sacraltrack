/**
 * Error handling utilities for Appwrite operations
 */

type AppwriteErrorDetails = {
  code?: number;
  type?: string;
  message: string;
  time?: string;
};

/**
 * Formats Appwrite errors in a user-friendly way
 */
export const formatAppwriteError = (error: any): AppwriteErrorDetails => {
  if (!error) {
    return { message: 'Unknown error occurred' };
  }

  return {
    code: error.code || 0,
    type: error.type || 'unknown',
    message: getReadableErrorMessage(error),
    time: new Date().toISOString()
  };
};

/**
 * Converts Appwrite error codes and messages to user-friendly messages
 */
export const getReadableErrorMessage = (error: any): string => {
  // Extract message from error object
  const message = error.message || String(error);
  
  // Common Appwrite error codes
  if (error.code === 401) {
    return 'Authentication required. Please sign in.';
  }
  
  if (error.code === 403) {
    return 'You don\'t have permission to perform this action.';
  }
  
  if (error.code === 404) {
    return 'The requested resource was not found.';
  }
  
  if (error.code === 409) {
    return 'This item already exists.';
  }
  
  if (error.code === 429) {
    return 'Too many requests. Please try again later.';
  }
  
  if (error.code === 503) {
    return 'Service temporarily unavailable. Please try again later.';
  }
  
  // Parse specific error messages
  if (message.includes('total_likes') && message.includes('invalid type')) {
    return 'Invalid profile data format. Please try again.';
  }
  
  if (message.includes('authentication') || message.includes('retries')) {
    return 'Authentication failed. Please sign in again.';
  }
  
  if (message.includes('Missing required permission')) {
    return 'You don\'t have permission to access this resource.';
  }
  
  if (message.includes('network')) {
    return 'Network connection error. Please check your internet connection.';
  }
  
  // Default message
  return message;
};

/**
 * Logs detailed error information for debugging
 */
export const logAppwriteError = (context: string, error: any): void => {
  console.error(`[${context}] Error:`, formatAppwriteError(error));
  
  // Additional details for debugging
  if (error.response) {
    console.error(`[${context}] Response:`, error.response);
  }
};

/**
 * Should retry the operation based on error type
 */
export const shouldRetryOperation = (error: any): boolean => {
  // Don't retry permission errors
  if (error.code === 401 || error.code === 403) {
    return false;
  }
  
  // Don't retry conflict errors
  if (error.code === 409) {
    return false;
  }
  
  // Rate limiting should be retried
  if (error.code === 429) {
    return true;
  }
  
  // Service unavailable should be retried
  if (error.code === 503) {
    return true;
  }
  
  // Network errors should be retried
  if (error.message && error.message.includes('network')) {
    return true;
  }
  
  return false;
}; 