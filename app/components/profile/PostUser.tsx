"use client";

import { useEffect, useState, useCallback, memo } from "react";
import PostMainLikes from "@/app/components/PostMainLikes";
import Link from "next/link";
import { useUser } from "@/app/context/user";
import { useRouter } from "next/navigation";
import useCreateBucketUrl from "@/app/hooks/useCreateBucketUrl";
import { PostUserCompTypes } from "@/app/types";
import toast from "react-hot-toast";
import useDeletePostById from "@/app/hooks/useDeletePostById";
import { BsThreeDotsVertical } from 'react-icons/bs';
import EditTrackPopup from "@/app/components/trackedit/EditTrackPopup";
import { usePlayerContext } from '@/app/context/playerContext';
import { AudioPlayer } from '@/app/components/AudioPlayer';
import { PostWithProfile } from "@/app/types";
import useGetProfileByUserId from "@/app/hooks/useGetProfileByUserId";


const PostUser = memo(({ post, params }: PostUserCompTypes) => {
  const router = useRouter();
  const contextUser = useUser();
  const { currentTrack, isPlaying, setCurrentTrack, togglePlayPause } = usePlayerContext();
  const [showPopup, setShowPopup] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [imageError, setImageError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const imageUrl = useCreateBucketUrl(post?.image_url);
  const avatarUrl = useCreateBucketUrl(post?.profile?.image);
  const m3u8Url = useCreateBucketUrl(post?.m3u8_url);

  const isCurrentTrack = currentTrack?.id === post.id;
  
useEffect(() => {
    console.log('Post data:', {
      postId: post.id,
      userId: post.user_id,
      m3u8_url: post.m3u8_url,
      created_m3u8Url: m3u8Url
    });
  }, [post, m3u8Url]);

  const handlePlay = useCallback(() => {
    if (!post.m3u8_url) {
      console.error('Missing m3u8_url for post:', post.id);
      return;
    }

    if (isCurrentTrack) {
      togglePlayPause();
    } else {
      setCurrentTrack({
        id: post.id,
        audio_url: m3u8Url,
        image_url: imageUrl,
        name: post.trackname,
        artist: post.profile.name,
      });
      
      if (!isPlaying) {
        togglePlayPause();
      }
    }
  }, [isCurrentTrack, isPlaying, post, m3u8Url, imageUrl, setCurrentTrack, togglePlayPause]);

useEffect(() => {
    const loadImage = (url: string, setError: (error: boolean) => void) => {
      if (typeof window !== 'undefined') {
        const img = new window.Image();
        img.src = url;
        img.onerror = () => setError(true);
        img.onload = () => setError(false);
      }
    };

    if (imageUrl) loadImage(imageUrl, setImageError);
    if (avatarUrl) loadImage(avatarUrl, setAvatarError);
  }, [imageUrl, avatarUrl]);

  const handleDeletePost = useCallback(async () => {
    let res = confirm("Are you sure you want to delete this post?");
    if (!res) return;

    setIsDeleting(true);
    try {
      await useDeletePostById(params?.postId, post?.audio_url);
      router.push(`/profile/${params.userId}`);
      setIsDeleting(false);
      toast.success("Your release will be removed after the page refreshes.");
    } catch (error) {
      console.error(error);
      setIsDeleting(false);
      toast.error("An error occurred while deleting the post.");
    }
  }, [params, post, router]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userProfile = await useGetProfileByUserId(post.user_id);
        setProfile(userProfile);
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    
    fetchProfile();
  }, [post.user_id]);

  // Добавляем проверку на существование post и profile
  if (!post || !post.profile) {
    return null; // или можно вернуть заглушку/скелетон
  }

  return ( 
    <div className="bg-[#24183d] rounded-2xl overflow-hidden mb-6 w-full max-w-[100%] md:w-[450px] mx-auto">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.user_id}`}>
            <img
              className="w-12 h-12 rounded-full object-cover"
              src={avatarError ? '/images/placeholder-user.jpg' : useCreateBucketUrl(profile?.image)}
              alt={profile?.name || 'User'}
              onError={() => setAvatarError(true)}
            />
          </Link>
          <div>
            <Link href={`/profile/${post.user_id}`} className="text-white font-medium hover:underline">
              {profile?.name || 'Unknown User'}
            </Link>
            <p className="text-[#818BAC] text-sm">{post.trackname || 'trackname'}</p>
          </div>
        </div>

        {post.user_id === contextUser?.user?.id && (
                <div className="relative">
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="p-1 rounded-xl">
                    <BsThreeDotsVertical className="text-white hover:text-[#20DDBB]" size={20} />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-32 bg-[#1A2338] shadow-xl rounded-xl z-50">
                      <button
                        onClick={() => {
                          setShowPopup(true);
                    setIsDropdownOpen(false);
                        }}
                        className="block px-4 py-2 text-sm text-white rounded-xl hover:bg-[#272B43] w-full text-left"
                      >
                        Edit
                      </button>
                      <button
                        disabled={isDeleting}
                        onClick={() => {
                          handleDeletePost();
                    setIsDropdownOpen(false);
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

      <div className="relative w-full">
        <div 
          onClick={handlePlay}
          className="w-full aspect-square bg-cover bg-center relative overflow-hidden cursor-pointer"
          style={{ 
            backgroundImage: imageError ? 
              'linear-gradient(45deg, #2E2469, #351E43)' : 
              `url(${imageUrl})`
          }}
        >
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <img 
                  src="/images/T-logo.svg" 
                  alt="Default" 
                  className="w-16 h-16 opacity-20"
                />
                <div className="mt-4 w-32 h-[1px] bg-white/10"></div>
                <div className="mt-4 space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-48 h-1 bg-white/10 rounded"
                      style={{
                        width: `${Math.random() * 100 + 100}px`
                      }}
                    ></div>
                  ))}
                </div>
            </div>
          </div>
          )}
        </div>
        </div>
        
      <div className="px-4 py-2 w-full">
        <AudioPlayer 
          m3u8Url={m3u8Url}
          isPlaying={isCurrentTrack && isPlaying}
          onPlay={handlePlay}
          onPause={togglePlayPause}
        />
      </div>

      <div className="px-4 py-3 flex justify-between items-center w-full">
        <div className="flex items-center gap-6">
          <PostMainLikes post={post} />
        </div>
      </div>

      {showPopup && (
    <EditTrackPopup
    postData={{
            id: post.id,
            audioUrl: post.audio_url,
            imageUrl: post.image_url,
            m3u8_url: post.m3u8_url,
            trackname: post.trackname,
            created_at: post.created_at,
            updated_at: post.created_at,
        profile: {
              user_id: post.profile.user_id,
              name: post.profile.name,
              image: post.profile.image,
            },
          }}
          onUpdate={(updatedData) => {
            console.log("Updated Data:", updatedData);
          }}
    onClose={() => setShowPopup(false)}
/>
)}
    </div>
  );
});

PostUser.displayName = 'PostUser';

export default PostUser;

