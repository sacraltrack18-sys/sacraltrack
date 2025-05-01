'use client';

import { useState, useEffect } from 'react';
import { APPWRITE_CONFIG } from '@/libs/AppWriteClient';

/**
 * A utility component to display Appwrite connection status.
 * Only use this in development environments.
 */
export default function AppwriteStatus() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [details, setDetails] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/check-appwrite-connection');
        const data = await response.json();
        
        if (data.success) {
          setStatus('success');
        } else {
          setStatus('error');
        }
        
        setDetails(data);
        console.log('Appwrite connection details:', data);
      } catch (error) {
        setStatus('error');
        setDetails({ error: error instanceof Error ? error.message : String(error) });
        console.error('Error checking Appwrite connection:', error);
      }
    };

    checkConnection();
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-md" 
      style={{ backgroundColor: status === 'success' ? 'rgba(0, 128, 0, 0.9)' : 
        status === 'error' ? 'rgba(220, 20, 60, 0.9)' : 'rgba(0, 0, 0, 0.7)' }}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-white font-bold">Appwrite Connection Status</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-white hover:text-gray-300"
        >
          ✕
        </button>
      </div>
      
      <div className="text-white mb-2">
        {status === 'loading' && 'Checking connection...'}
        {status === 'success' && 'Connected to Appwrite successfully!'}
        {status === 'error' && 'Failed to connect to Appwrite.'}
      </div>
      
      <div className="text-xs text-white opacity-80">
        <div>Endpoint: {APPWRITE_CONFIG.endpoint}</div>
        <div>Project ID: {APPWRITE_CONFIG.projectId}</div>
        <div>Database ID: {APPWRITE_CONFIG.databaseId}</div>
        <div>Stats Collection: {APPWRITE_CONFIG.statisticsCollectionId}</div>
        {process.env.NEXT_PUBLIC_COLLECTION_ID_TRACK_STATISTICS && (
          <div>Env Track Stats ID: {process.env.NEXT_PUBLIC_COLLECTION_ID_TRACK_STATISTICS}</div>
        )}
      </div>
      
      {details && status === 'error' && (
        <div className="mt-2 bg-red-900 p-2 rounded text-white text-xs overflow-auto max-h-40">
          <p className="font-bold">Error Details:</p>
          <pre>{JSON.stringify(details, null, 2)}</pre>
        </div>
      )}

      {status === 'success' && details && (
        <div className="mt-2 text-xs text-white">
          <p>All connected! Stats collection exists: {details.statisticsCollection?.exists ? 'Yes' : 'No'}</p>
        </div>
      )}

      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-white">
          <p>In development mode only. Remove this component in production.</p>
        </div>
      )}
    </div>
  );
} 