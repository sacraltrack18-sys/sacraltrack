"use client";

import { useEffect, useRef, useState, useCallback, memo } from "react";
import PostMainLikes from "@/app/components/PostMainLikes";
import Link from "next/link";
import { useUser } from "@/app/context/user";
import { useRouter } from "next/navigation";
import useCreateBucketUrl from "@/app/hooks/useCreateBucketUrl";
import { PostUserCompTypes } from "@/app/types";
import toast from "react-hot-toast";
import useDeletePostById from "@/app/hooks/useDeletePostById";
import WaveSurfer from "wavesurfer.js";
import {
  BsFillStopFill,
  BsFillPlayFill,
} from "react-icons/bs";
import { FaEdit } from 'react-icons/fa';
import { BsThreeDotsVertical } from 'react-icons/bs';
import EditTrackPopup from "@/app/components/trackedit/EditTrackPopup";
import { usePlayerContext } from '@/app/context/playerContext';
import Player from '@/app/components/Player'; 
import { PostWithProfile } from "@/app/types";






// Определите интерфейс для Post
interface Post {
  audioUrl: string;
  imageUrl: string;
  title: string;
  caption: string;
  genre: string;
  id: string; 
}



const PostUser = memo(({ post, params }: PostUserCompTypes) => {
  const router = useRouter();
  const contextUser = useUser();
  const user = useUser();
  
  const imageRef = useRef<HTMLDivElement>(null);

  // Default value for player's audio
  const [currentAudioId, setCurrentAudioId] = useState<string | null>(null);

  const [showPopup, setShowPopup] = useState(false);

  const [postData, setPostData] = useState<PostWithProfile>(post);


  const handleUpdate: (updatedData: any) => void = (updatedData) => {
    console.log("Updated Data:", updatedData);
    // Ваш код для обновления состояния или других действий
};


  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // WaveSurfer
  const waveformRef = useRef<HTMLDivElement>(null);

  // Default value for isPlaying
  const [isPlaying, setIsPlaying] = useState(false);

  // cursor
  
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


  // Обработчики для открытия и закрытия дропдауна
  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const handleCloseDropdown = () => {
    setIsDropdownOpen(false);
  };


  // DELETE POST
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleDeletePost = useCallback(async () => {
    let res = confirm("Are you sure you want to delete this post?");
    if (!res) return;

    setIsDeleting(true);

    try {
      await useDeletePostById(params?.postId, post?.audio_url);
      router.push(`/profile/${params.userId}`);
      setIsDeleting(false);
      toast.success("Your release will be removed after the page refreshes.", {
        duration: 7000,
      });
    } catch (error) {
      console.log(error);
      setIsDeleting(false);
      toast.error("An error occurred while deleting the post.", {
        duration: 7000,
      });
    }
  }, [params, post, router]);

  // DROPDOWN
  const [isOpen, setIsOpen] = useState(false);

  const handleItemClick = (item: string) => {
    console.log(`Clicked on ${item}`);
  };

  const handleToggle = () => {
    console.log("Button clicked");
    setIsOpen(!isOpen);
  };


  // Handle playing and pausing
  const handlePause = () => {
    if (currentAudioId === post.id) {
      setIsPlaying(false);
      setCurrentAudioId(null);
    } else {
      setCurrentAudioId(post.id);
      setIsPlaying(true);
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

  


  console.log("contextUser?.user?.id:", contextUser?.user?.id);
  console.log("post?.profile?.user_id:", post?.profile?.user_id);
  console.log("post:", post);


  

  return ( 
    <>
     

      <div
        id={`PostUser-${post.id}`}
        ref={imageRef}
        style={{
          backgroundImage: `url(${useCreateBucketUrl(post?.image_url)})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}      
        onClick={(e) => handlePause()}
        className={`relative z-[0] flex flex-col  md:ml-[600px] justify-between p-2 mb-5 object-cover rounded-2xl md:mr-[0px]  md:w-[600px] w-full h-[500px] overflow-hidden`}


      > 
       {/* Name / Trackname */}
        <div className="bg-[#272B43]/90 shadow-[0px_5px_5px_-10px_rgba(0,0,0,0.5)] w-full h-[54px] flex items-center rounded-2xl pt-0.5">
          {post && post.profile && (
            <Link
              className="text-[#818BAC] size-[15px]"
              href={`/profile/${post.profile.user_id}`}
            >
              <span className="font-bold hover:underline cursor-pointer">
                {post.profile.name}
              </span>
            </Link>
          )}

          <div className="pl-3 w-full px-2">
            <div className="flex items-center justify-between pb-0.5">
              <p className="text-[14px] pb-0.5 break-words md:max-w-[400px] max-w-[300px]">
                {post.text}
              </p>
              
              {/* Дропдаун для опций Edit и Delete */}
              {post && post.user_id === contextUser?.user?.id && (
                <div className="relative">
                  <button onClick={toggleDropdown} className="focus:outline-none p-1 pr-2 pt-1 rounded-xl ">
                    <BsThreeDotsVertical className="text-white hover:text-[#20DDBB]" size={20} />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-32 bg-[#1A2338] shadow-xl rounded-xl z-50">
                      <button
                        onClick={() => {
                          setShowPopup(true);
                          handleCloseDropdown();
                        }}
                        className="block px-4 py-2 text-sm text-white rounded-xl hover:bg-[#272B43] w-full text-left"
                      >
                        Edit
                      </button>
                      <button
                        disabled={isDeleting}
                        onClick={() => {
                          handleDeletePost();
                          handleCloseDropdown();
                        }}
                        className="block px-4 py-2 text-sm text-white rounded-xl hover:bg-[#272B43] w-full text-left"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

     
        </div>


        {/* Controls */}
        <div className="wavesurfer-controls hidden absolute z-[111] top-[43%] left-[43%] border-color-white border-opacity-20 px-10 py-7 rounded-xl cursor-pointer">
          <button onClick={handlePause}>
            {isPlaying ? <BsFillStopFill size={24} /> : <BsFillPlayFill size={24} />}
          </button>
        </div>
        
       
        {/* Player Component Integration */}
        <div className="absolute bottom-24 left-0 right-0 z-10 opacity-90">
           <Player
          audioUrl={useCreateBucketUrl(post.mp3_url)} // Ensure correct audio URL is passed
          isPlaying={isPlaying}
          onPlay={() => setIsPlaying(true)} // Callback for when playing
          onPause={() => setIsPlaying(false)} // Callback for when paused
        /></div>

         {/* Likes etc. */}
        <div className="absolute w-[97%] z-[111] h-[60px] bottom-0">
          <PostMainLikes post={post} />
        </div>
      </div>
 

      {showPopup && (
    <EditTrackPopup
    postData={{
        id: postData.id,
        audioUrl: postData.audio_url, // Use image_url as defined
        imageUrl: postData.image_url,  // Use image_url as defined
        caption: postData.text, 
        trackname: postData.trackname,
        created_at: postData.created_at,
        updated_at: postData.created_at, // sourced from the original Post
        profile: {
            user_id: postData.profile.user_id,
            name: postData.profile.name,
            image: postData.profile.image,
        },
    }}

    onUpdate={handleUpdate}
    onClose={() => setShowPopup(false)}
/>

)}

    </>
  );
});

export default PostUser;

