import { NextResponse } from 'next/server';

// Helper function to handle API responses
const apiResponse = (data: any, status: number) => {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};

export async function GET() {
  const clientId = process.env.JAMENDO_CLIENT_ID;

  if (!clientId) {
    console.error("JAMENDO_CLIENT_ID is not set in environment variables.");
    return apiResponse({ error: "Server configuration error." }, 500);
  }

  const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${clientId}&format=json&limit=10&tags=electronic`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Jamendo API error: ${response.status} ${response.statusText}`);
      return apiResponse({ error: `Failed to fetch data from Jamendo: ${response.statusText}` }, response.status);
    }

    const data = await response.json();
    
    // Transform the data to match the ApiTrack interface
    const tracks = data.results.map((track: any) => ({
      id: track.id,
      name: track.name,
      artist_name: track.artist_name,
      album_name: track.album_name,
      image: track.image,
      audio: track.audio,
      audiodownload: track.audiodownload,
    }));

    return apiResponse(tracks, 200);
  } catch (error) {
    console.error("Error fetching from Jamendo API:", error);
    return apiResponse({ error: "An unexpected error occurred." }, 500);
  }
}
