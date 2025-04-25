'use client';

import { useState, useEffect } from 'react';
import { useClientAudioProcessor } from '@/app/hooks/useClientAudioProcessor';
import { motion } from 'framer-motion';
import SharedArrayBufferError from './SharedArrayBufferError';

interface ClientAudioProcessorProps {
  audioFile: File | null;
  onProcessed: (mp3File: File, segments: Array<{name: string, data: Uint8Array, file: File}>, m3u8Content: string, duration: number) => void;
  onError: (error: string) => void;
}

const ClientAudioProcessor = ({ audioFile, onProcessed, onError }: ClientAudioProcessorProps) => {
  const { processAudio, isProcessing, progress, stage } = useClientAudioProcessor();
  const [status, setStatus] = useState<'idle' | 'processing' | 'error' | 'completed'>('idle');
  const [currentTask, setCurrentTask] = useState<string>('');
  const [showSharedArrayBufferError, setShowSharedArrayBufferError] = useState<boolean>(false);

  useEffect(() => {
    if (!audioFile) {
      return;
    }

    // Проверяем доступность SharedArrayBuffer в браузере
    if (typeof SharedArrayBuffer === 'undefined') {
      console.error('SharedArrayBuffer недоступен. Проверьте заголовки безопасности на сервере.');
      setStatus('error');
      setShowSharedArrayBufferError(true);
      onError(`Для обработки аудио требуется поддержка SharedArrayBuffer. 
      Пожалуйста, убедитесь, что:
      1. Вы используете современный браузер (Chrome, Firefox, Edge)
      2. Вы не в режиме инкогнито
      3. Страница загружена по HTTPS с правильными заголовками безопасности`);
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
          setShowSharedArrayBufferError(true);
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

  if (showSharedArrayBufferError) {
    return <SharedArrayBufferError />;
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
          <h3 className="text-xl font-bold text-white">Обработка аудио</h3>
          <p className="text-white/70 text-sm mt-1">
            Происходит обработка прямо в вашем браузере, подождите...
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
          <p>Обработка выполняется локально на вашем устройстве, <br />данные не отправляются на сервер</p>
        </div>
      </motion.div>
    </div>
  );
};

export default ClientAudioProcessor; 