// Import the required modules
const path = require('path');
const { builder } = require('@netlify/functions');

// Function to handle requests
async function handler(event, context) {
  // Get the path from the event
  const { path: requestPath } = event;
  
  // Get the absolute path to the static files
  const staticDir = path.join(process.cwd(), '.next');
  
  // Log for debugging
  console.log('Handling request for:', requestPath);

  // Pass the request to Next.js
  try {
    // Check if this is for the API
    if (requestPath.startsWith('/api/')) {
      // For API routes, import the API handler
      const { default: apiHandler } = require('../.next/server/app/api');
      return await apiHandler(event, context);
    }
    
    // For other routes, use the Next.js handler
    const { default: nextHandler } = require('../.next/server/pages');
    return await nextHandler(event, context);
  } catch (error) {
    console.error('Error handling request:', error);
    
    // Return a 500 error
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
}

// Export the handler with configuration
exports.handler = builder(handler); 