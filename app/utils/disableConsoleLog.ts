/**
 * Utility to disable console logs throughout the application
 * 
 * This file will override the default console methods to suppress logging
 * in production environments while still allowing logs in development mode
 * if explicitly enabled.
 */

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

// Check if we're in production mode
const isProduction = process.env.NODE_ENV === 'production';

// Flag to check if logs should be disabled
// Default: disable logs in production, enable in development
const shouldDisableLogs = isProduction || process.env.NEXT_PUBLIC_DISABLE_CONSOLE_LOGS === 'true';

/**
 * Disables all console logging methods except for errors
 */
export const disableConsoleLogs = () => {
  if (shouldDisableLogs) {
    // Override console methods with empty functions
    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
    console.debug = () => {};
    
    // Optionally keep error logs for critical issues
    // Comment the line below if you want to disable error logs too
    // console.error = () => {};
    
    console.log = function() {
      // This will silently ignore all log calls
      return;
    };
  }
};

/**
 * Restores the original console functionality
 */
export const enableConsoleLogs = () => {
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;
};

/**
 * Creates a conditional logger that only logs if enabled
 */
export const createLogger = (namespace: string) => {
  return {
    log: (...args: any[]) => !shouldDisableLogs && console.log(`[${namespace}]`, ...args),
    info: (...args: any[]) => !shouldDisableLogs && console.info(`[${namespace}]`, ...args),
    warn: (...args: any[]) => !shouldDisableLogs && console.warn(`[${namespace}]`, ...args),
    error: (...args: any[]) => console.error(`[${namespace}]`, ...args), // Always log errors
    debug: (...args: any[]) => !shouldDisableLogs && console.debug(`[${namespace}]`, ...args),
  };
};

// Export default function for easy import and immediate invocation
export default disableConsoleLogs; 