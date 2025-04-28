'use client';

import { useState, useEffect } from 'react';
import { useClientAudioProcessor } from '@/app/hooks/useClientAudioProcessor';
import { motion } from 'framer-motion';

interface ClientAudioProcessorProps {
  audioFile: File | null;
  onProcessed: (mp3File: File, segments: Array<{name: string, data: Uint8Array, file: File}>, m3u8Content: string, duration: number) => void;
  onError: (error: string) => void;
}

const ClientAudioProcessor = ({ audioFile, onProcessed, onError }: ClientAudioProcessorProps) => {
  const { processAudio, isProcessing, progress, stage } = useClientAudioProcessor();
  const [status, setStatus] = useState<'idle' | 'processing' | 'error' | 'completed'>('idle');
  const [currentTask, setCurrentTask] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!audioFile) {
      return;
    }

    // Check for SharedArrayBuffer availability in the browser
    if (typeof SharedArrayBuffer === 'undefined') {
      console.error('SharedArrayBuffer is not available. Check security headers on the server.');
      setStatus('error');
      setErrorMessage('Audio processing requires SharedArrayBuffer support.');
      onError(`Audio processing requires SharedArrayBuffer support.
      Please make sure that:
      1. You are using a modern browser
      2. You are not in incognito mode
      3. The page is loaded via HTTPS with proper security headers`);
      return;
    }

    const handleProcessing = async () => {
      try {
        setStatus('processing');
        
        const result = await processAudio({
          audioFile,
          onProgress: (stage, progress, message) => {
            console.log(`Progress: ${stage} - ${progress}% - ${message || ''}`);
            setCurrentTask(message || stage);
          }
        });

        if (result.success && result.mp3File && result.segments && result.m3u8Content && result.duration) {
          setStatus('completed');
          onProcessed(result.mp3File, result.segments, result.m3u8Content, result.duration);
        } else {
          setStatus('error');
          setErrorMessage(result.error || 'Unknown error during processing');
          onError(result.error || 'Unknown error during processing');
        }
      } catch (error) {
        console.error('Audio processing error:', error);
        setStatus('error');
        
        // Check if the error is related to SharedArrayBuffer
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorMessage.includes('SharedArrayBuffer') || errorMessage.includes('browser')) {
          setErrorMessage('Audio processing error: unable to use SharedArrayBuffer');
          onError(`Audio processing error: ${errorMessage}`);
        } else {
          setErrorMessage(errorMessage);
          onError(errorMessage);
        }
      }
    };

    handleProcessing();
  }, [audioFile, processAudio, onProcessed, onError]);

  if (status === 'error') {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-[#2A184B] to-[#1f1239] p-8 rounded-xl max-w-lg w-full mx-4 shadow-xl border border-[#20DDBB]/10"
        >
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-white">Audio Processing Error</h3>
            <p className="text-white/70 text-sm mt-3">
              {errorMessage}
            </p>
          </div>

          <div className="mt-6">
            <div className="bg-[#1a0f2e] p-4 rounded-lg mb-4">
              <h4 className="text-white font-semibold mb-2">Recommendations:</h4>
              <ul className="list-disc list-inside text-white/70 space-y-1 text-sm">
                <li>Make sure you're using a modern browser</li>
                <li>Don't use incognito mode</li>
                <li>Verify the page is loaded via HTTPS</li>
                <li>Try refreshing the page</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-[#20DDBB] to-[#018CFD] text-white font-medium py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
            >
              Refresh Page
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isProcessing && status !== 'processing') {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-[#2A184B] to-[#1f1239] p-8 rounded-xl max-w-lg w-full mx-4 shadow-xl border border-[#20DDBB]/10"
      >
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold text-white">Audio Processing</h3>
          <p className="text-white/70 text-sm mt-1">
            Processing is happening directly in your browser, please wait...
          </p>
        </div>

        <div className="mb-6">
          <p className="text-[#20DDBB] font-medium mb-2">{currentTask || stage}</p>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-[#20DDBB] to-[#018CFD]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-right text-white/70 text-sm mt-1">{progress}%</p>
        </div>

        <div className="mt-6 text-center text-white/50 text-xs">
          <p>Processing is done locally on your device, <br />data is not sent to the server</p>
        </div>
      </motion.div>
    </div>
  );
};

export default ClientAudioProcessor; 