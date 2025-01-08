"use client";

import Link from "next/link";
import PostMainLikes from "./PostMainLikes";
import React, { useEffect, useRef, useState, useCallback, useContext, memo } from "react";
import useCreateBucketUrl from "../hooks/useCreateBucketUrl";
import { PostWithProfile, PostMainCompTypes } from "../types";
import { usePathname } from "next/navigation";
import WaveSurfer from "wavesurfer.js";
import { BsFillStopFill, BsFillPlayFill } from "react-icons/bs";
import toast from "react-hot-toast";
import CartContext from "../context/CartContext";
import { LazyLoadImage } from "react-lazy-load-image-component";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { usePlayerContext } from '@/app/context/playerContext'; // Updated context usage
import Player from '@/app/components/Player'; // Import the Player component


interface MyWaveSurfer extends WaveSurfer {
  destroy: () => void;
}


const PostMain = memo(({ post }: PostMainCompTypes) => {
  const pathname = usePathname();

  const { currentAudioId, setCurrentAudioId } = usePlayerContext();

 
  // Add to cart
  const { addItemToCart } = useContext(CartContext);

  const addToCartHandler = useCallback(() => {
    addItemToCart({
      product: post.id,
      name: post.text,
      image: post.image_url,
      audio: post.mp3_url,
      user: post.user_id,
      price: post.price,
    });
    console.log("added to cart");
    toast.success("Added to cart");
  }, [addItemToCart, post]);

  // PlayPause btn card
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null); // Keep this for mouseover/mouseout

// Default value for isPlaying
const [isPlaying, setIsPlaying] = useState(false);


useEffect(() => {
  const handleImageMouseOver = () => {
    if (isPlaying && imageRef.current) {
      imageRef.current.style.cursor = "url('/images/pause-icon.svg'), auto";
    } else if (imageRef.current) {
      imageRef.current.style.cursor = "url('/images/play-icon.svg'), auto";
    }
  };

  const handleImageMouseOut = () => {
    if (imageRef.current) {
      imageRef.current.style.cursor = "default";
    }
  };

  if (imageRef.current) {
    imageRef.current.addEventListener('mouseover', handleImageMouseOver);
    imageRef.current.addEventListener('mouseout', handleImageMouseOut);
  }

  return () => {
    if (imageRef.current) {
      imageRef.current.removeEventListener('mouseover', handleImageMouseOver);
      imageRef.current.removeEventListener('mouseout', handleImageMouseOut);
    }
  };
}, [isPlaying, imageRef]);

useEffect(() => {
  if (waveformRef.current) {
    const handleWaveformMouseEnter = () => {
      if (imageRef.current) {
        imageRef.current.style.cursor = "default";
      }
    };

    waveformRef.current.addEventListener('mouseenter', handleWaveformMouseEnter);

    return () => {
      if (waveformRef.current) {
        waveformRef.current.removeEventListener('mouseenter', handleWaveformMouseEnter);
      }
    };
  }
}, [imageRef.current]);



  // WaveSurfer
//  const [isPlaying, setIsPlaying] = useState(false);
  const waveformRef = useRef<HTMLDivElement>(null);
  const [wavesurfer, setWaveSurfer] = useState<MyWaveSurfer | null>(null);
  

    // Переключение воспроизведения
    const handlePause = () => {
      if (currentAudioId === post.id) {
        setIsPlaying(false);
        setCurrentAudioId(null); // Остановить аудио
      } else {
        setCurrentAudioId(post.id); // Установить ID текущего трека
        setIsPlaying(true); // Включить воспроизведение
      }
    };
  
    useEffect(() => {
      // Проверка на смену текущего трека
      if (currentAudioId === post.id) {
        setIsPlaying(true); // Если текущий трек соответствует ID поста, включаем
      } else {
        setIsPlaying(false); // Если нет, останавливаем
      }
    }, [currentAudioId, post.id]);

    
  
  
  return (
    <div
      id={`PostMain-${post.id}`}
      ref={imageRef}
      style={{
        backgroundImage: `url(${useCreateBucketUrl(post?.image_url)})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      onClick={(e) => handlePause()}
      className="relative flex flex-col justify-between p-2 mb-5 
        object-cover rounded-[20px] h-[500px] overflow-hidden 
        md:w-[700px] w-full mx-auto"
    >
      {post ? (
        <>
          <div className="flex justify-between">
            {/* Profile Image */}
            <div className="cursor-pointer">
              <LazyLoadImage
                className="rounded-[15px] max-h-[50px] w-[50px]"
                src={useCreateBucketUrl(post?.profile?.image)}
                alt="Profile"
                loading="lazy"
              />
            </div>

            {/* Name / Trackname */}
            <div className="bg-[#272B43]/95 shadow-[0px_5px_5px_-10px_rgba(0,0,0,0.5)] w-full h-[50px] flex items-between rounded-xl ml-2">
              <div className="pl-3 w-full px-2">
                <div className="flex items-center justify-between">
                  <Link
                    className="text-[#818BAC] text-[15px]"
                    href={`/profile/${post.profile.user_id}`}
                  >
                    <span className="font-bold hover:underline cursor-pointer">
                      {post.profile.name}
                    </span>
                  </Link>
                </div>
                <p className="text-[14px] pb-0.5 break-words md:max-w-[400px] max-w-[300px]">
                  {post.text}
                </p>
              </div>
            </div>
          </div>

          {/* Genre Tag */}
          <div className="absolute top-16 left-16 py-1 px-2 bg-[#272B43]/90 shadow-[0px_5px_5px_-10px_rgba(0,0,0,0.5)] flex items-center rounded-lg">
            <p className="text-[13px] text-[#818BAC] hover:text-white cursor-pointer ">
              {post.genre}
            </p>
          </div>

          {/* Audio Controls */}
          <div className="absolute md:visible hidden wavesurfer-controls z-5 top-[40%] left-[43%] border-color-white border-opacity-20 px-10 py-7 rounded-xl">
          <button
            className="w-[40px] h-[40px]"
            onClick={() => handlePause()}
          >
            {isPlaying ? (
              <BsFillStopFill size={24} />
            ) : (
              <BsFillPlayFill size={24} />
            )}
          </button>
          </div>
            
          
        <div className="absolute bottom-24 left-0 right-0 z-10 opacity-90">
          <Player 
            audioUrl={useCreateBucketUrl(post.mp3_url)} 
            isPlaying={isPlaying} 
            onPlay={() => setIsPlaying(true)} // Обновите, если хотите
            onPause={() => setIsPlaying(false)} // Обновите, если хотите
          /></div>

          {/* Interaction Buttons */}
          <div className="absolute w-full h-[60px] bottom-0 justify-between pr-4">
            <PostMainLikes post={post} />
          </div>

          {/* Add to Cart Button */}
          <div className="absolute right-2 align-middle top-[30%]">
          <button
            onClick={addToCartHandler}
            className="py-12 px-4 bg-[#20DDBB] text-white rounded-t-xl hover:bg-[#21C3A6]"
          >
            <img src="/images/cart.svg" alt="sacraltrack cart" />
          </button>
          <div className="w-auto flex items-center justify-center py-2 px-2 bg-[#21C3A6] text-white text-size-[12px] rounded-b-xl">
            ${post.price}
          </div>
        </div>
        </>
        ) : (
        <div className="flex flex-col justify-between p-2 mt-5 mb-5 object-cover rounded-[20px] h-[500px] overflow-hidden">
         {/*Skeleton*/}
      </div>
      )}
      </div>
      );
      });

export default PostMain;
