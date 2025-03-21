export function createM3U8File(segmentIds: string[]): File {
    const m3u8Content = '#EXTM3U\n' +
        '#EXT-X-VERSION:3\n' +
        '#EXT-X-TARGETDURATION:10\n' +
        '#EXT-X-MEDIA-SEQUENCE:0\n' +
        '#EXT-X-PLAYLIST-TYPE:VOD\n' +
        segmentIds.map(segmentId => 
            `#EXTINF:10,\n${segmentId}`
        ).join('\n') +
        '\n#EXT-X-ENDLIST';

    return new File([m3u8Content], 'playlist.m3u8', {
        type: 'application/x-mpegURL'
    });
} 