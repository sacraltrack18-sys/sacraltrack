// This file helps Netlify run your Next.js application correctly
const { createRequestHandler } = require('./node_modules/next/dist/server/future/route-modules/app-route/module');

// Create a request handler that's compatible with Netlify's serverless functions
module.exports = async (req, res) => {
  try {
    const handler = createRequestHandler({
      page: req.path,
      request: {
        headers: req.headers,
        method: req.method,
        nextUrl: {
          pathname: req.path,
          searchParams: new URLSearchParams(req.query)
        }
      }
    });
    
    // Call the request handler with the request and response objects
    await handler(req, res);
  } catch (error) {
    console.error('Error handling request:', error);
    
    // If there's an error, return a 500 status code
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}; 