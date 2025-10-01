# Appwrite Connection Troubleshooting Guide

This document provides guidance for resolving common issues with Appwrite connections in your SacralTrack application.

## Current Setup

Your application uses the following Appwrite collections (configured in .env):

- **NEXT_PUBLIC_COLLECTION_ID_PROFILE**: `67f225fc0022b2dc0881`
- **NEXT_PUBLIC_COLLECTION_ID_POST**: `67f22813001f125cc1e5`
- **NEXT_PUBLIC_COLLECTION_ID_TRACK_STATISTICS**: `67fa8893001cb797a064`
- **NEXT_PUBLIC_COLLECTION_ID_TRACK_ANALYTICS**: `67fa89b40009e6b07992`
- **NEXT_PUBLIC_COLLECTION_ID_TRACK_INTERACTIONS**: `67fa8aa1001ba183beb4`

## Common Issues and Solutions

### 1. Fetch Errors with API Routes

If you see errors like:
```
GET http://localhost:3000/api/track-stats/[id] 500 (Internal Server Error)
Error fetching track statistics: Error: Failed to fetch stats
```

**Potential solutions:**

- **Check collection permissions**: Ensure your collections have proper read/write permissions for both authenticated and guest users, if needed.
- **Verify collection IDs**: Make sure the collection IDs in `.env` and `.env.local` are correct and match those in your Appwrite console.
- **Network issues**: Confirm your application can connect to Appwrite's servers.

### 2. AbortError: signal is aborted without reason

This error often occurs when there's a problem with the client-side connection to Appwrite.

**Potential solutions:**

- **Restart development server**: Sometimes a simple restart of your Next.js server can fix connection issues.
- **Check API endpoint**: Verify the Appwrite endpoint URL is correct in your environment variables.
- **Browser cache**: Clear your browser cache or use incognito mode.

### 3. Missing Collections or Documents

If your application is working but specific data isn't showing up:

**Potential solutions:**

- **Verify collection setup**: Go to your Appwrite console and ensure all collections exist with the IDs defined in your `.env` file.
- **Check document IDs**: Ensure you're using the correct document IDs when fetching or updating documents.
- **Create fallback documents**: Your API now includes fallback mechanisms for missing documents.

## Diagnostic Steps

1. **Use the AppwriteStatus component** (add to any page temporarily):
   ```jsx
   import AppwriteStatus from '@/app/components/AppwriteStatus';
   
   // Inside your component return:
   <AppwriteStatus />
   ```

2. **Check connection directly**:
   Visit `/api/check-appwrite-connection` in your browser when running locally.

3. **View console logs**:
   The application logs detailed information about Appwrite connections in the browser console and server logs.

## Permissions Setup

For collections that need to be accessed from the client side:

1. Go to your Appwrite Console
2. Navigate to the Database section
3. Select your database
4. For each collection, configure these permissions:
   - **Track Statistics Collection**:
     - Read: `["role:all"]` (allows anyone to read)
     - Create: `["role:all"]` (allows creation from client)
     - Update: `["role:all"]` (allows updates from client)
   - **Posts/Tracks Collection**:
     - Read: `["role:all"]` (allows anyone to view tracks)

## Client-Side Optimization

The application has been optimized to function without a server-side API key by:

1. Using client-side permissions for basic operations
2. Providing fallback data when operations fail
3. Implementing better error handling throughout the app

## Getting Help

If you continue to experience issues after trying these solutions:

1. Check the Appwrite documentation: https://appwrite.io/docs
2. Review your collection structure in the Appwrite console
3. Examine the error details in your browser console and server logs 