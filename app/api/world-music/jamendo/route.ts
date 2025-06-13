import { NextResponse } from 'next/server';

const JAMENDO_API_URL = 'https://api.jamendo.com/v3.0';

interface JamendoTrack {
    id: string;
    name: string;
    artist_name: string;
    album_name: string;
    image: string; // URL to image
    audio: string; // URL to MP3
    audiodownload: string; // Often same as audio, or direct download link
    duration: number;
    license_ccurl: string; // Creative Commons license URL
}

interface JamendoApiResponse {
    headers: {
        status: string;
        code: number;
        error_message: string;
        warnings: string;
        results_count: number;
    };
    results: JamendoTrack[];
}

export async function GET(request: Request) {
    const clientId = process.env.JAMENDO_CLIENT_ID;

    if (!clientId) {
        console.error('JAMENDO_CLIENT_ID is not set in environment variables.');
        return NextResponse.json(
            { error: 'Jamendo API client ID is not configured.' },
            { status: 500 }
        );
    }

    try {
        // Example: Fetch 20 popular tracks, ensuring they are streamable
        // You can customize parameters: limit, order, tags, artist_name, etc.
        // 'audioformat=mp32' tries to ensure MP3 format, 'audiodownload' often gives a direct link
        const params = new URLSearchParams({
            client_id: clientId,
            format: 'jsonpretty', // or 'json'
            limit: '20',
            order: 'popularity_week', // or 'buzzrate', 'creationdate'
            audioformat: 'mp32', // Request MP3 format
            // include: 'musicinfo', // To get more details if needed
        });

        const response = await fetch(`${JAMENDO_API_URL}/tracks/?${params.toString()}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Jamendo API request failed:', response.status, errorData);
            return NextResponse.json(
                { error: `Failed to fetch data from Jamendo API. Status: ${response.status}`, details: errorData },
                { status: response.status }
            );
        }

        const data: JamendoApiResponse = await response.json();

        if (data.headers.status !== 'success' || data.headers.code !== 0) {
            console.error('Jamendo API returned an error:', data.headers);
            return NextResponse.json(
                { error: 'Jamendo API returned an error.', details: data.headers },
                { status: 500 } // Or a more specific error code if available
            );
        }

        const formattedTracks = data.results.map(track => ({
            id: track.id,
            title: track.name,
            artistName: track.artist_name,
            albumName: track.album_name,
            imageUrl: track.image.replace('album_id=0', 'width=300'), // Request a decent size image
            audioUrl: track.audiodownload || track.audio, // Prefer audiodownload if available
            duration: track.duration,
            source: 'Jamendo',
            licenseUrl: track.license_ccurl,
            type: 'api_track' // To distinguish from your own tracks
        }));

        return NextResponse.json(formattedTracks);

    } catch (error) {
        console.error('Error in Jamendo API route:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred while fetching from Jamendo API.' },
            { status: 500 }
        );
    }
}