"use client";

import React, { useEffect, useRef, useState } from 'react';

const AdsTerraTest: React.FC = () => {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[AdsTerraTest] ${message}`);
  };

  const loadAd = () => {
    if (!adContainerRef.current) {
      addLog('❌ Container ref not available');
      return;
    }

    // Очищаем контейнер
    adContainerRef.current.innerHTML = '';
    setAdLoaded(false);
    setError(null);
    setLogs([]);

    addLog('🚀 Starting AdsTerra test...');

    const atOptions = {
      key: '4385a5a6b91cfc53c3cdf66ea55b3291',
      format: 'iframe',
      height: 50,
      width: 320,
      params: {}
    };

    addLog(`📋 Options: ${JSON.stringify(atOptions)}`);

    // Создаем скрипт конфигурации (точно как в документации AdsTerra)
    const configScript = document.createElement('script');
    configScript.type = 'text/javascript';
    configScript.innerHTML = `
      console.log('[AdsTerra] Loading Static Banner with options:', ${JSON.stringify(atOptions)});
      atOptions = {
        'key' : '${atOptions.key}',
        'format' : 'iframe',
        'height' : ${atOptions.height},
        'width' : ${atOptions.width},
        'params' : {}
      };
    `;

    // Создаем скрипт загрузки (точно как в документации AdsTerra)
    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = `//www.highperformanceformat.com/${atOptions.key}/invoke.js`;
    invokeScript.async = true;

    try {
      // Добавляем скрипты в правильном порядке (как в документации)
      adContainerRef.current.appendChild(configScript);
      adContainerRef.current.appendChild(invokeScript);
      addLog('📝 AdsTerra Static Banner scripts added to container (following official docs)');

      // Устанавливаем загрузку через задержку
      setTimeout(() => {
        setAdLoaded(true);
        addLog('✅ Banner marked as loaded');

        // Проверяем появление iframe или других элементов
        setTimeout(() => {
          const iframe = adContainerRef.current?.querySelector('iframe');
          if (iframe) {
            addLog('✅ Iframe found in container');
            addLog(`📐 Iframe size: ${iframe.width}x${iframe.height}`);
            addLog(`🔗 Iframe src: ${iframe.src}`);
          } else {
            addLog('⚠️ No iframe found, checking for other ad elements...');
            const allElements = adContainerRef.current?.querySelectorAll('*');
            addLog(`📊 Total elements in container: ${allElements?.length || 0}`);

            // Проверяем наличие скриптов
            const scripts = adContainerRef.current?.querySelectorAll('script');
            addLog(`📜 Scripts in container: ${scripts?.length || 0}`);

            // Проверяем наличие div элементов
            const divs = adContainerRef.current?.querySelectorAll('div');
            addLog(`📦 Div elements in container: ${divs?.length || 0}`);
          }
        }, 3000);
      }, 1000);

    } catch (error) {
      addLog(`❌ Error adding script: ${error}`);
      setError(`Error adding script: ${error}`);
    }
  };

  useEffect(() => {
    // Автоматически загружаем при монтировании
    loadAd();
  }, []);

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">AdsTerra Test</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Контейнер для баннера */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Banner Container</h2>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div
              ref={adContainerRef}
              className="bg-gradient-to-br from-gray-700 to-gray-800 rounded border border-gray-600 flex items-center justify-center relative"
              style={{
                width: 300,
                height: 250,
                minHeight: 250
              }}
            >
              {!adLoaded && !error && (
                <div className="text-center text-gray-400">
                  <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-blue-500 rounded-full mx-auto mb-2"></div>
                  <div className="text-sm">Loading AdsTerra...</div>
                </div>
              )}
              
              {error && (
                <div className="text-center text-red-400">
                  <div className="text-sm">❌ {error}</div>
                </div>
              )}
            </div>
            
            <div className="mt-4 flex gap-2">
              <button
                onClick={loadAd}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              >
                Reload Ad
              </button>
              
              <div className="flex items-center gap-2">
                <span className="text-sm">Status:</span>
                <span className={`text-sm font-medium ${
                  adLoaded ? 'text-green-400' : error ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {adLoaded ? '✅ Loaded' : error ? '❌ Error' : '⏳ Loading'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Логи */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Debug Logs</h2>
          <div className="bg-gray-800 p-4 rounded-lg h-96 overflow-y-auto">
            <div className="space-y-1 text-sm font-mono">
              {logs.map((log, index) => (
                <div key={index} className="text-gray-300">
                  {log}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-gray-500 italic">No logs yet...</div>
              )}
            </div>
          </div>
          
          <button
            onClick={() => setLogs([])}
            className="mt-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
          >
            Clear Logs
          </button>
        </div>
      </div>

      {/* Информация */}
      <div className="mt-8 bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Test Information</h3>
        <div className="text-sm text-gray-300 space-y-1">
          <div><strong>AdsTerra Key:</strong> 0654df9f27dd77270cf8f1aaeed1818a</div>
          <div><strong>Format:</strong> iframe</div>
          <div><strong>Size:</strong> 300x250</div>
          <div><strong>Script URL:</strong> https://www.highperformanceformat.com/0654df9f27dd77270cf8f1aaeed1818a/invoke.js</div>
        </div>
      </div>
    </div>
  );
};

export default AdsTerraTest;
