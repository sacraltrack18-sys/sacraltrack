import { storage, ID } from '@/libs/AppWriteClient';
import { ProcessingStats } from '@/app/types';

interface SegmentData {
    name: string;
    data: string;
}

interface AudioProcessingResult {
    segmentIds: string[];
    playlist: string;
}

const useAudioSegments = () => {
    const uploadSegmentsAndCreatePlaylist = async (
        segments: SegmentData[],
        setProcessingStats?: (stats: ProcessingStats) => void
    ): Promise<AudioProcessingResult> => {
        try {
            // Upload segments and get their IDs
            const totalSegments = segments.length;
            const segmentUploads = [];

            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                const segmentBlob = new Blob([Buffer.from(segment.data, 'base64')], { type: 'audio/mp3' });
                const segmentFile = new File([segmentBlob], segment.name, { type: 'audio/mp3' });
                
                setProcessingStats?.({
                    stage: 'Uploading segments...',
                    progress: Math.round((i / totalSegments) * 100),
                    details: `Uploading segment ${i + 1} of ${totalSegments}`
                });

                const upload = await storage.createFile(
                    '6615406df11fae74aa22',
                    ID.unique(),
                    segmentFile
                );
                
                console.log(`Uploaded segment ${i + 1}/${totalSegments} with ID: ${upload.$id}`);
                segmentUploads.push(upload);
            }

            // Verify we have all segment IDs
            if (segmentUploads.length !== segments.length) {
                throw new Error('Not all segments were uploaded successfully');
            }

            // Create M3U8 playlist with segment IDs
            const playlistLines = [
                '#EXTM3U',
                '#EXT-X-VERSION:3',
                '#EXT-X-TARGETDURATION:10',
                '#EXT-X-MEDIA-SEQUENCE:0',
                '#EXT-X-PLAYLIST-TYPE:VOD'
            ];

            // Add each segment with its storage ID
            for (let i = 0; i < segmentUploads.length; i++) {
                const upload = segmentUploads[i];
                if (!upload || !upload.$id) {
                    throw new Error(`Missing ID for segment ${i}`);
                }
                playlistLines.push(`#EXTINF:10,`);
                playlistLines.push(upload.$id);
            }

            // Add playlist end marker
            playlistLines.push('#EXT-X-ENDLIST');

            // Join all lines with newlines
            const playlist = playlistLines.join('\n');

            // Verify playlist contains IDs
            const playlistContent = playlist.split('\n');
            const segmentLines = playlistContent.filter(line => !line.startsWith('#') && line.trim() !== '');
            if (segmentLines.length !== segmentUploads.length) {
                console.error('Playlist verification failed:');
                console.error('Expected segments:', segmentUploads.length);
                console.error('Found segment lines:', segmentLines.length);
                console.error('Playlist content:', playlist);
                throw new Error('Playlist generation failed - segment count mismatch');
            }

            // Log the final playlist content
            console.log('Generated M3U8 playlist:', playlist);

            const result = {
                segmentIds: segmentUploads.map(upload => upload.$id),
                playlist: playlist
            };

            // Verify result
            console.log('Final verification:', {
                segmentCount: result.segmentIds.length,
                playlistSegments: segmentLines.length,
                segmentIds: result.segmentIds,
                playlistLines: segmentLines
            });

            return result;
        } catch (error) {
            console.error('Error in uploadSegmentsAndCreatePlaylist:', error);
            throw error;
        }
    };

    return { uploadSegmentsAndCreatePlaylist };
};

export default useAudioSegments; 