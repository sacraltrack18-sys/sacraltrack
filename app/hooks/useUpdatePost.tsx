import { database, storage, ID } from '@/libs/AppWriteClient';
import { ProcessingStats } from '@/app/types';
import useAudioSegments from './useAudioSegments';
import toast from 'react-hot-toast';

const processingMessages = [
    "Converting your audio...",
    "Optimizing sound quality...",
    "Processing audio segments...",
    "Preparing HLS stream...",
    "Creating high-quality segments...",
    "Encoding audio stream...",
    "Optimizing for streaming...",
    "Processing: please wait...",
];

const useUpdatePost = async (
    postId: string,
    userId: string,
    trackname: string,
    audioFile: File | null,
    imageFile: File | null,
    setProcessingStats?: (stats: ProcessingStats) => void
) => {
    const { uploadSegmentsAndCreatePlaylist } = useAudioSegments();
    let audioProcessingResult: { segmentIds: string[]; playlist: string } | null = null;
    let messageInterval: NodeJS.Timeout | null = null;
    let currentMessageIndex = 0;

    // Function to rotate through processing messages
    const startMessageRotation = () => {
        messageInterval = setInterval(() => {
            currentMessageIndex = (currentMessageIndex + 1) % processingMessages.length;
            if (setProcessingStats) {
                const currentStats = {
                    stage: processingMessages[currentMessageIndex],
                    progress: lastProgress,
                    details: `Processing: ${lastProgress.toFixed(1)}%`
                };
                setProcessingStats(currentStats);
            }
        }, 2000); // Change message every 2 seconds
    };

    // Function to stop message rotation
    const stopMessageRotation = () => {
        if (messageInterval) {
            clearInterval(messageInterval);
            messageInterval = null;
        }
    };

    let lastProgress = 0;

    try {
        // Update basic post info first
        await database.updateDocument(
            '6615406df11fae74aa22',
            '6615408df7f8f0af7c6c',
            postId,
            {
                trackname: trackname,
            }
        );

        // If there's a new image file, process and upload it
        if (imageFile) {
            setProcessingStats?.({
                stage: 'Processing image...',
                progress: 0,
                details: 'Optimizing image...'
            });

            const formData = new FormData();
            formData.append('image', imageFile);

            const imageResponse = await fetch('/api/image/optimize', {
                method: 'POST',
                body: formData
            });

            if (!imageResponse.ok) {
                throw new Error('Failed to optimize image');
            }

            const imageResult = await imageResponse.json();
            
            if (imageResult.error) {
                throw new Error(imageResult.error);
            }

            const optimizedImageBlob = await fetch(imageResult.url).then(r => r.blob());
            const optimizedImageFile = new File([optimizedImageBlob], imageFile.name, {
                type: imageFile.type
            });

            const imageUpload = await storage.createFile(
                '6615406df11fae74aa22',
                ID.unique(),
                optimizedImageFile
            );

            await database.updateDocument(
                '6615406df11fae74aa22',
                '6615408df7f8f0af7c6c',
                postId,
                {
                    imageUrl: imageUpload.$id
                }
            );
        }

        // If there's a new audio file, process it
        if (audioFile) {
            setProcessingStats?.({
                stage: processingMessages[0],
                progress: 0,
                details: 'Starting audio processing...'
            });

            startMessageRotation();

            const formData = new FormData();
            formData.append('audio', audioFile);
            formData.append('postId', postId);
            formData.append('userId', userId);

            const audioResponse = await fetch('/api/audio/process', {
                method: 'POST',
                body: formData
            });

            if (!audioResponse.ok) {
                stopMessageRotation();
                throw new Error('Failed to process audio');
            }

            const reader = audioResponse.body?.getReader();
            if (!reader) {
                stopMessageRotation();
                throw new Error('No reader available');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(5));
                            
                            if (data.error) {
                                stopMessageRotation();
                                throw new Error(data.error);
                            }

                            // Update progress during conversion
                            if (data.progress !== undefined) {
                                // Handle both string and number progress values
                                let progressValue = data.progress;
                                if (typeof progressValue === 'string') {
                                    progressValue = progressValue.replace('Processing: ', '').replace(' % done', '');
                                }
                                const conversionProgress = parseFloat(progressValue);
                                
                                if (!isNaN(conversionProgress)) {
                                    // Ensure progress never goes backwards and moves smoothly
                                    lastProgress = Math.max(lastProgress, conversionProgress);
                                    // Conversion takes 80% of the total progress
                                    const totalProgress = Math.round(lastProgress * 0.8);
                                    
                                    setProcessingStats?.({
                                        stage: processingMessages[currentMessageIndex],
                                        progress: totalProgress,
                                        details: `Processing: ${lastProgress.toFixed(1)}%`
                                    });
                                }
                            }

                            // Handle processed files from server
                            if (data.result) {
                                stopMessageRotation();
                                console.log('Server processing complete, uploading segments...');
                                // Upload segments and create playlist (last 20% of progress)
                                audioProcessingResult = await uploadSegmentsAndCreatePlaylist(
                                    data.result.segments,
                                    (stats) => {
                                        const uploadProgress = stats.progress;
                                        setProcessingStats?.({
                                            stage: stats.stage,
                                            progress: 80 + Math.round(uploadProgress * 0.2), // Last 20% for uploads
                                            details: stats.details
                                        });
                                    }
                                );

                                setProcessingStats?.({
                                    stage: 'Processing complete',
                                    progress: 100,
                                    details: 'Audio processing and upload complete'
                                });
                            }
                        } catch (e) {
                            stopMessageRotation();
                            console.error('Error parsing SSE data:', e);
                            throw e;
                        }
                    }
                }
            }
        }

        // If we have processed audio, update the database with the new URLs
        if (audioProcessingResult) {
            console.log('Creating M3U8 file with playlist:', audioProcessingResult.playlist);
            
            const m3u8File = new File(
                [audioProcessingResult.playlist],
                'playlist.m3u8',
                { type: 'application/x-mpegURL' }
            );

            const m3u8Upload = await storage.createFile(
                '6615406df11fae74aa22',
                ID.unique(),
                m3u8File
            );

            console.log('Uploaded M3U8 file with ID:', m3u8Upload.$id);
            console.log('Updating database with segment IDs:', audioProcessingResult.segmentIds);

            await database.updateDocument(
                '6615406df11fae74aa22',
                '6615408df7f8f0af7c6c',
                postId,
                {
                    m3u8Url: m3u8Upload.$id,
                    segments: audioProcessingResult.segmentIds
                }
            );

            console.log('Database updated successfully');
        }

        return true;
    } catch (error) {
        stopMessageRotation();
        console.error('Error in useUpdatePost:', error);
        throw error;
    }
};

export default useUpdatePost;
