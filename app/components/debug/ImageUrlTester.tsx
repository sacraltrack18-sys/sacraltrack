"use client";

import React, { useState } from 'react';
import { fixAppwriteImageUrl, getAppwriteImageUrl } from '@/app/utils/appwriteImageUrl';
import Image from 'next/image';

const ImageUrlTester: React.FC = () => {
  const [testUrl, setTestUrl] = useState('https://fra.cloud.appwrite.io/v1/storage/buckets/67f2239600384003fd78/files/67f28c49ae7c69a9fc64/view?project=67f223590032b871e5f6&mode=admin');
  const [fixedUrl, setFixedUrl] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleTest = () => {
    const fixed = fixAppwriteImageUrl(testUrl);
    setFixedUrl(fixed);
    setImageLoaded(false);
    setImageError(false);
    console.log('Original URL:', testUrl);
    console.log('Fixed URL:', fixed);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
    console.log('✅ Image loaded successfully!');
  };

  const handleImageError = () => {
    setImageLoaded(false);
    setImageError(true);
    console.log('❌ Image failed to load');
  };

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Appwrite Image URL Tester</h1>
      
      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium mb-2">Test URL:</label>
          <textarea
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
            rows={3}
            placeholder="Enter Appwrite image URL to test..."
          />
        </div>
        
        <button
          onClick={handleTest}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Test URL Fix
        </button>
      </div>

      {fixedUrl && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Results:</h3>
            <div className="bg-gray-800 p-4 rounded-lg space-y-2">
              <div>
                <strong>Original URL:</strong>
                <div className="text-sm text-gray-300 break-all">{testUrl}</div>
              </div>
              <div>
                <strong>Fixed URL:</strong>
                <div className="text-sm text-green-300 break-all">{fixedUrl}</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Image Test:</h3>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="relative w-64 h-64 mx-auto mb-4">
                <Image
                  src={fixedUrl}
                  alt="Test image"
                  fill
                  style={{ objectFit: 'cover' }}
                  className="rounded-lg"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              </div>
              
              <div className="text-center">
                {imageLoaded && (
                  <div className="text-green-400 font-semibold">
                    ✅ Image loaded successfully!
                  </div>
                )}
                {imageError && (
                  <div className="text-red-400 font-semibold">
                    ❌ Image failed to load
                  </div>
                )}
                {!imageLoaded && !imageError && (
                  <div className="text-yellow-400 font-semibold">
                    🔄 Loading image...
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Changes Made:</h3>
            <div className="bg-gray-800 p-4 rounded-lg">
              <ul className="text-sm space-y-1">
                {testUrl.includes('mode=admin') && (
                  <li className="text-green-300">✅ Removed mode=admin parameter</li>
                )}
                {!testUrl.includes('/v1/') && fixedUrl.includes('/v1/') && (
                  <li className="text-green-300">✅ Added /v1/ to API path</li>
                )}
                {testUrl === fixedUrl && (
                  <li className="text-blue-300">ℹ️ No changes needed</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUrlTester;
