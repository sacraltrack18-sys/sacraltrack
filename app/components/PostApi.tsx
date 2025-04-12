"use client";

import Link from "next/link"
import PostMainLikes from "./PostMainLikes"
import React from "react";
import { useEffect, useRef, useState } from "react"
import useCreateBucketUrl from "../hooks/useCreateBucketUrl"
import { PostWithProfile, Product, PostMainCompTypes } from "../types"
import { usePathname } from "next/navigation";
import { BsFillStopFill, BsFillPlayFill, BsSkipForward, BsSkipBackward } from "react-icons/bs";
import toast from 'react-hot-toast';

export default function PostMain() {

    const pathname = usePathname();

    {/*Add to cart */}
    
    // Заглушка для функции добавления в корзину (без контекста)
    const addToCartHandler = (track: any) => {
        // Временная заглушка функции добавления в корзину
        console.log("Cart functionality is temporarily disabled");
        toast.success("Added to cart");
    };
    
    {/* Audio Player */}

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Rapid API data
    const [tracks, setTracks] = useState<any[]>([]);

    useEffect(() => {
        const fetchTracks = async () => {
        try {
            const response = await fetch("https://shazam-api6.p.rapidapi.com/shazam/top_tracks_city?city_name=Moscow&city_name=Moscow&country_code=RU&country_code=RU&limit=10", {
            method: 'GET',
            headers: {
                'x-rapidapi-key': 'b86b4a1c60msh15aa7380a612681p1990bejsn385e63344ab6',
                'x-rapidapi-host': 'shazam-api6.p.rapidapi.com'
                }
                });

            if (response.ok) {
            const result = await response.json();
            setTracks(result.result.data);
            }
            } catch (err) {
            console.error(err);
            }
            };

            fetchTracks();
            }, []);

    // Handle play/pause toggle
    const handlePlayPause = () => {
        if (!audioRef.current) return;
        
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(err => console.error("Error playing audio:", err));
        }
        
        setIsPlaying(!isPlaying);
    };

    // Handle audio ended event
    const handleAudioEnded = () => {
        setIsPlaying(false);
    };

            return (
            <>
            {tracks.map((track, index) => (
  <div key={track.id} className={`relative flex flex-col justify-between p-2 mt-5 mb-5 mx-5 object-cover 
  rounded-[20px] h-[500px] overflow-hidden ${pathname === '/' ? 'lg:w-[700px]' : 'lg:w-[500px]'}`}>
    <div className="flex justify-between">
      {/* Profile Image */}
      <div className="cursor-pointer">
        {track.attributes.images?.coverart && (
          <img className="rounded-[15px] max-h-[50px] w-[50px]" src={track.attributes.images.coverart} />
        )}
      </div>

      {/* Name / Trackname */}
                        <div className="bg-[#272B43]/95 shadow-[0px_5px_5px_-10px_rgba(0,0,0,0.5)] w-full h-[50px] flex items-between rounded-xl ml-2">
        <div className="pl-3 w-full px-2">
          <div className="flex items-center justify-between">
            <Link className="text-[#818BAC] size-[15px]" href={`/profile/${track.attributes.artistId}`}>
              <span className="font-bold hover:underline cursor-pointer">
                {track.attributes.artistName}
              </span>
            </Link>
          </div>
          <p className="text-[14px] pb-0.5 break-words md:max-w-[400px] max-w-[300px]">{track.attributes.name}</p>
        </div>
      </div>
    </div>

    {/* Controls */}
                    <div className="audio-controls absolute z-5 top-[43%] left-[43%] border-color-white border-opacity-20 px-10 py-7 rounded-xl">
                        <button onClick={handlePlayPause} className="text-3xl">
                            {isPlaying && currentTrackIndex === index ? <BsFillStopFill /> : <BsFillPlayFill />}
      </button>
    </div>

    {/* Audio */}
    <div className="flex overflow-hidden h-[40px] mb-16 w-full">
                        {index === currentTrackIndex && (
                            <audio 
                                ref={audioRef}
                                src={track.attributes.previews ? track.attributes.previews[0].url : ''}
                                onEnded={handleAudioEnded}
                                className="w-full hidden"
                            />
                        )}
                        <div className="w-full h-[40px] bg-gray-700 rounded-lg">
                            <div className="audio-progress h-full bg-blue-500 rounded-lg" style={{ width: isPlaying ? '100%' : '0', transition: 'width 0.1s linear' }} />
      </div>
    </div>

    {/* Buttons like comments share */}
    <div className="absolute w-full h-[60px] bottom-1 justify-between pr-4">
      <PostMainLikes post={tracks[0]} />
    </div>
            </div>
            ))}
            </>
            );
            }


