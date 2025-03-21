export function generateM3u8(segmentUrls: string[]): string {
  let m3u8 = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:10\n#EXT-X-MEDIA-SEQUENCE:0\n#EXT-X-PLAYLIST-TYPE:VOD\n`;
  segmentUrls.forEach((url) => {
    m3u8 += `#EXTINF:10,\n${url}\n`;
  });
  m3u8 += `#EXT-X-ENDLIST`;
  return m3u8;
}
