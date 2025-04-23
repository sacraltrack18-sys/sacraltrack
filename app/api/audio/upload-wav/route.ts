import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { database, ID } from '@/libs/AppWriteClient';

// Create a temporary upload directory
const TEMP_DIR = './tmp/wav-uploads';

// Function to send progress events to the client
function sendProgress(writer: WritableStreamDefaultWriter, progress: number, message: string) {
    const data = {
        type: 'progress',
        progress,
        message
    };
    
    writer.write(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

// Function to send completion event
function sendComplete(writer: WritableStreamDefaultWriter, data: any) {
    const completeData = {
        type: 'complete',
        ...data
    };
    
    writer.write(new TextEncoder().encode(`data: ${JSON.stringify(completeData)}\n\n`));
}

// Function to send error events
function sendError(writer: WritableStreamDefaultWriter, error: string) {
    const data = {
        type: 'error',
        error
    };
    
    writer.write(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(request: NextRequest) {
    // Create a response with streaming support
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Create a response object with proper headers for streaming
    const response = new Response(stream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });

    // Process in background
    (async () => {
        try {
            // Ensure the temp directory exists
            await mkdir(TEMP_DIR, { recursive: true });
            
            // Send initial progress
            sendProgress(writer, 0, 'Starting WAV upload...');
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Check if the request is multipart/form-data
            const contentType = request.headers.get('content-type');
            if (!contentType || !contentType.includes('multipart/form-data')) {
                sendError(writer, 'Request must be multipart/form-data');
                writer.close();
                return;
            }

            // Parse the multipart form data
            sendProgress(writer, 5, 'Processing form data...');
            const formData = await request.formData();
            const audioFile = formData.get('audio') as File;

            if (!audioFile) {
                sendError(writer, 'No audio file provided');
                writer.close();
                return;
            }

            // Validate file type
            if (!audioFile.name.toLowerCase().endsWith('.wav')) {
                sendError(writer, 'Only WAV files are accepted');
                writer.close();
                return;
            }

            // Generate unique filename
            sendProgress(writer, 10, 'Preparing file for upload...');
            const fileId = uuidv4();
            const fileExt = audioFile.name.split('.').pop();
            const fileName = `${fileId}.${fileExt}`;
            const filePath = join(TEMP_DIR, fileName);

            // Get file size
            const fileSize = audioFile.size;
            sendProgress(writer, 15, `Processing ${(fileSize / (1024 * 1024)).toFixed(2)} MB file...`);

            // Convert File to ArrayBuffer with simulated progress
            sendProgress(writer, 20, 'Reading file data...');
            const arrayBuffer = await audioFile.arrayBuffer();
            
            // Gradually increase progress while processing the file
            const processingSteps = 10;
            for (let i = 0; i < processingSteps; i++) {
                const progressPercent = 20 + ((i + 1) / processingSteps * 60);
                sendProgress(writer, progressPercent, `Processing WAV data... ${Math.round(progressPercent)}%`);
                // Add small delay between updates to show progress
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            // Convert to Buffer and write to disk with progress updates
            sendProgress(writer, 80, 'Saving file to server...');
            const buffer = Buffer.from(arrayBuffer);
            await writeFile(filePath, buffer);
            
            // Add a short delay before completing to show final progress
            sendProgress(writer, 90, 'Finalizing upload...');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Final progress update
            sendProgress(writer, 100, 'Upload complete!');
            
            // Send completion event
            sendComplete(writer, { 
                success: true, 
                message: 'WAV file uploaded successfully',
                fileId,
                fileName
            });
            
            // Close the writer
            writer.close();
            
        } catch (error: any) {
            console.error('Error in WAV upload:', error);
            sendError(writer, error.message || 'Internal server error');
            writer.close();
        }
    })();
    
    // Return the response immediately
    return response;
} 