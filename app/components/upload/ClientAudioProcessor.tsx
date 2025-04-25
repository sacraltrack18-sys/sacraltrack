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

  useEffect(() => {
    if (!audioFile) {
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
          onError(result.error || 'Неизвестная ошибка при обработке');
        }
      } catch (error) {
        console.error('Audio processing error:', error);
        setStatus('error');
        
        // Проверяем, связана ли ошибка с SharedArrayBuffer
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('SharedArrayBuffer') || errorMessage.includes('browser')) {
          onError(`Ошибка обработки: ${errorMessage}. 
          Рекомендации: 
          1. Используйте последнюю версию Chrome, Firefox или Edge
          2. Не используйте режим инкогнито
          3. Если проблема не решена, обратитесь в поддержку`);
        } else {
          onError(errorMessage);
        }
      }
    };

    handleProcessing();
  }, [audioFile, processAudio, onProcessed, onError]);

  if (!isProcessing && status !== 'processing') {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
      <motion.div 
        className="bg-gradient-to-br from-[#2A184B] to-[#1f1239] p-6 rounded-2xl shadow-xl border border-[#20DDBB]/20 w-[90%] max-w-md"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="text-center">
          <h3 className="text-2xl font-semibold text-white mb-4">Обработка аудио</h3>
          <p className="text-white/70 mb-2">{stage}</p>
          {currentTask && <p className="text-white/50 text-sm mb-6">{currentTask}</p>}
          
          {/* Progress bar */}
          <div className="w-full h-3 bg-[#20DDBB]/10 rounded-full overflow-hidden mb-4">
            <motion.div 
              className="h-full bg-gradient-to-r from-[#20DDBB] to-[#018CFD]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          <div className="flex justify-between text-sm text-white/60 mb-6">
            <span>Прогресс: {progress}%</span>
            <span>{stage}</span>
          </div>
          
          <div className="text-center text-white/60 text-sm">
            <p>Пожалуйста, не закрывайте это окно до завершения обработки.</p>
            <p className="mt-2 text-xs">Вся обработка происходит локально на вашем устройстве.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ClientAudioProcessor; 