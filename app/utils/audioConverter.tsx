import { Action } from '@/app/types';
import { FFmpeg } from '@ffmpeg/ffmpeg';

// Function to get the file extension
function getFileExtension(file_name: string) {
  const regex = /(?:\.([^.]+))?$/;
  const match = regex.exec(file_name);
  if (match && match[1]) {
    return match[1];
  } 
  return '';
}

// Function to remove the file extension
function removeFileExtension(file_name: string) {
  const lastDotIndex = file_name.lastIndexOf('.');
  if (lastDotIndex !== -1) {
    return file_name.slice(0, lastDotIndex);
  }
  return file_name;
}
export async function convertWavToMp3(ffmpeg: FFmpeg, wavFile: File): Promise<{ mp3Url: string, mp3Blob: Blob } | { error: string }> {
  try {
    const file_name = wavFile.name;
    const outputMp3 = removeFileExtension(file_name) + '.mp3';

    // Write the WAV file to FFmpeg
    ffmpeg.writeFile(file_name, new Uint8Array(await wavFile.arrayBuffer()));

    const mp3Conversion = [
      '-i',
      file_name,
      '-b:a',
      '192k', // Set the audio bitrate to 192k
      outputMp3,
    ]

    // Execute the MP3 conversion
    await ffmpeg.exec(mp3Conversion);

    // Read the MP3 file data
    const mp3Data = await ffmpeg.readFile(outputMp3);
    const mp3Blob = new Blob([mp3Data], { type: 'audio/mp3' });
    const mp3Url = URL.createObjectURL(mp3Blob);

    // Return the URL and Blob without triggering automatic download
    return { mp3Url, mp3Blob };
  } catch (error) {
    return { error: 'An error occurred while converting the audio file' };
  }
}
