'use client';

import React, { useEffect, useState } from 'react';
import { client, database, account, APPWRITE_CONFIG } from '@/libs/AppWriteClient';
import { useUser } from '@/app/context/user';
import { logAppwriteError } from '@/app/utils/errorHandling';
import { testProfileCreation } from '@/app/utils/testUtils';

/**
 * AppwriteStatus component - Used for diagnosing connection issues
 * 
 * Add this component temporarily to any page to check connection status:
 * import AppwriteStatus from '@/app/components/AppwriteStatus';
 * 
 * Then add it to your component:
 * <AppwriteStatus />
 */
const AppwriteStatus = () => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [details, setDetails] = useState<any>({});
  const [authStatus, setAuthStatus] = useState<'none' | 'authenticated' | 'error'>('none');
  const userContext = useUser();
  
  const renderStatus = () => {
    switch (status) {
      case 'checking':
        return <div className="text-yellow-500">Checking Appwrite connection...</div>;
      case 'connected':
        return (
          <div className="text-green-500">
            Connected to Appwrite
            {authStatus === 'authenticated' && (
              <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-1 rounded">Authenticated</span>
            )}
            {authStatus === 'none' && (
              <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">Not Authenticated</span>
            )}
          </div>
        );
      case 'error':
        return (
          <div className="text-red-500 flex flex-col gap-2">
            <div>Error connecting to Appwrite</div>
            <button 
              onClick={() => {
                setStatus('checking');
                setDetails({});
                checkConnection();
              }}
              className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded w-fit hover:bg-red-200"
            >
              Retry Connection
            </button>
          </div>
        );
      default:
        return null;
    }
  };
  
  // Extract checkConnection function so we can reuse it
  const checkConnection = async () => {
    try {
      setStatus('checking');
      
      // Basic config check
      const config = {
        endpoint: APPWRITE_CONFIG.endpoint,
        projectId: APPWRITE_CONFIG.projectId,
        databaseId: APPWRITE_CONFIG.databaseId,
        profileCollection: APPWRITE_CONFIG.userCollectionId,
      };
      
      // Try to check health by getting profile documents
      // (Appwrite v1 SDK doesn't have listCollections, so we check a collection directly)
      const response = await database.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.userCollectionId,
        []
      );
      
      // Check if user collection exists by verifying the response
      const userCollectionExists = response && response.documents;
      
      setStatus('connected');
      setDetails({
        config,
        documentsCount: response.total,
        userCollectionExists,
        timestamp: new Date().toISOString()
      });
      
      // Check auth status if connected
      try {
        if (userContext?.user) {
          setAuthStatus('authenticated');
        } else {
          const session = await account.getSession('current');
          if (session) {
            setAuthStatus('authenticated');
          }
        }
      } catch (authError) {
        setAuthStatus('none');
        console.log('Not authenticated:', authError);
      }
    } catch (error) {
      logAppwriteError('AppwriteStatus', error);
      setStatus('error');
      setDetails({
        error: error.message || 'Unknown error',
        code: error.code,
        timestamp: new Date().toISOString()
      });
    }
  };
  
  // Check connection status on mount
  useEffect(() => {
    checkConnection();
  }, [userContext]);
  
  return (
    <div className="p-4 border rounded-lg bg-gray-50 my-4 text-sm">
      <h3 className="font-semibold mb-2">Appwrite Connection Status</h3>
      {renderStatus()}
      
      <div className="mt-2 overflow-auto max-h-40 border p-2 bg-gray-100 rounded text-xs font-mono">
        <pre>{JSON.stringify(details, null, 2)}</pre>
      </div>
      
      {status === 'connected' && (
        <div className="mt-4 flex flex-col gap-2">
          <h4 className="font-semibold text-xs">Test Utilities</h4>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (!userContext?.user) {
                  alert('You must be logged in to test profile creation');
                  return;
                }
                try {
                  const result = await testProfileCreation();
                  alert(result.success 
                    ? `Profile test successful: ${result.message}` 
                    : `Profile test failed at stage: ${result.stage}`);
                  
                  // Update details to show result
                  setDetails({
                    ...details,
                    profileTest: result
                  });
                } catch (error) {
                  alert('Error testing profile: ' + (error.message || 'Unknown error'));
                  logAppwriteError('AppwriteStatus', error);
                }
              }}
              className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
            >
              Test Profile Creation
            </button>
            
            <button
              onClick={checkConnection}
              className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200"
            >
              Refresh Status
            </button>
          </div>
        </div>
      )}
      
      <div className="mt-2 text-xs text-gray-500">
        This component is for diagnostic purposes only. Remove in production.
      </div>
    </div>
  );
};

export default AppwriteStatus; 