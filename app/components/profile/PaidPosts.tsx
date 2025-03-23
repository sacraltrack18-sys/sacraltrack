import { useEffect, useRef, useState, useCallback, memo } from "react";
import useGetPaidPostByUserId, { PaidPostData } from '@/app/hooks/useGetPaidPostByUserId';
import useGetAllPostsForDownloads from '@/app/hooks/useGetAllPostsForDownloads';
import WaveSurfer from "wavesurfer.js"
import { BsFillStopFill, BsFillPlayFill, BsDownload } from 'react-icons/bs';
import { AiOutlineLike, AiOutlineComment } from 'react-icons/ai';
import PostMainLikes from '../PostMainLikes';
import Link from "next/link"
import useCreateBucketUrl from "@/app/hooks/useCreateBucketUrl"
import { usePaidPostStore } from '@/app/stores/usePaidPostStore';
import useFileDownload from '@/app/hooks/useFileDownload';
import { PostWithProfile } from '@/app/types';
import { client, storage } from '@/libs/AppWriteClient';
import { usePlayerContext } from '@/app/context/playerContext';
import Player from '@/app/components/Player'; 






interface PaidPostsProps {
  userId: string;
  posts: Post[];
}

interface Post {
  id: string;
  user_id: string;
  audio_url: string;
  mp3_url: string;
  trackname: string;
  image_url: string;
  text: string;
  created_at: string;
  price: number;
  genre: string;
  likes: number;
  comments: number;
  profile: {
    id: string;
    user_id: string;
    name: string;
    image: string;
  };
}

const PaidPosts: React.FC<PaidPostsProps> = ({ userId, posts }) => {
  const { paidPosts, setPaidPosts } = usePaidPostStore();
  const [currentAudioId, setCurrentAudioId] = useState<string | null>(null);
  
  const imageRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState<{ [key: string]: boolean }>({}); // Изменяем на объект для отслеживания состояния каждого трека

  // WaveSurfer
  const waveformRef = useRef<HTMLDivElement>(null);
  const [wavesurfer, setWaveSurfer] = useState<WaveSurfer | null>(null);


  // PlayPause
  const handlePause = (postId: string) => {
    if (currentAudioId === postId) {
      // Останавливаем воспроизведение для текущего поста
      setIsPlaying((prev) => ({ ...prev, [postId]: false }));
      setCurrentAudioId(null);
    } else {
      // Останавливаем воспроизведение текущего поста и начинаем воспроизводить новый пост
      setIsPlaying((prev) => {
        const updatedPlaying = { ...prev, [postId]: true }; // Устанавливаем новый пост в воспроизведение
        if (currentAudioId) {
          updatedPlaying[currentAudioId] = false; // Останавливаем старый пост
        }
        return updatedPlaying;
      });
      setCurrentAudioId(postId);
    }
  };



  

  {/* Download Wav */}
      const handleDownload = async (post: PaidPostData) => {
        setIsLoading(true);
        try {
          if (!post.audio_url) {
            throw new Error("Audio URL is not available for this post");
          }
          
          const result = await storage.getFileDownload(
            process.env.NEXT_PUBLIC_BUCKET_ID!,
            post.audio_url
          );

          // Создаем ссылку для скачивания файла
          const downloadLink = document.createElement('a');
          downloadLink.href = result.href;
          downloadLink.setAttribute('download', post.trackname || 'audio-track');
          document.body.appendChild(downloadLink);
          downloadLink.click();
          downloadLink.remove();
        } catch (error) {
          console.error('Ошибка при загрузке файла:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      useEffect(() => {
        setPaidPosts(userId);
      }, [userId, setPaidPosts]);
  
   
   
  
      return (
        <>
          {paidPosts.length > 0 ? (
            paidPosts.map((post, index) => {
              //Check for null or undefined post before accessing properties
              if (!post) {
                console.warn(`Post at index ${index} is undefined or null.`);
                return null; 
              }
      
              return (
                <div
                  key={post.id}
                  ref={imageRef}
                  id={`PostMain-${post.id}`}
                  style={{
                    backgroundImage: `url(${useCreateBucketUrl(post.image_url ?? "")})`, // Handle undefined image_url
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                  onClick={() => handlePause(post.id)}
                  className={`relative z-[0] flex flex-col md:ml-[600px] justify-between p-2 mb-5 object-cover rounded-2xl md:mr-[0px] md:w-[600px] w-full h-[500px] overflow-hidden`}
                >
                  <div className="flex justify-between">
                    <div className="cursor-pointer">
                      <img
                        className="rounded-[15px] max-h-[50px] w-[50px]"
                        src={useCreateBucketUrl(post.profile?.image ?? '/placeholder.jpg')} //Safe access and default image
                        alt="Profile" //Always add alt text for accessibility
                      />
                    </div>
                    <div className="bg-[#272B43]/95 shadow-[0px_5px_5px_-10px_rgba(0,0,0,0.5)] w-full h-[50px] flex items-between rounded-xl ml-2">
                      <div className="pl-3 w-full px-2">
                        <div className="flex items-center justify-between">
                          <Link
                            className="text-[#818BAC] size-[15px]"
                            href={`/profile/${post.user_id}`}
                          >
                            <span className="font-bold hover:underline cursor-pointer">
                              {post.profile?.name ?? "Unknown User"} {/*Handle undefined name*/}
                            </span>
                          </Link>
                        </div>
                        <p className="text-[14px] pb-0.5 break-words md:max-w-[400px] max-w-[300px]">
                          {post.text ?? ""} {/*Handle undefined text*/}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-16 left-16 py-1 px-2 bg-[#272B43]/90 shadow-[0px_5px_5px_-10px_rgba(0,0,0,0.5)] flex items-center rounded-lg">
                    <p className="text-[13px] text-[#818BAC] hover:text-white cursor-pointer">
                      {post.genre ?? "Unknown Genre"} {/*Handle undefined genre*/}
                    </p>
                  </div>
                  <div className="absolute bottom-24 left-0 right-0 z-10 opacity-90">
                    <Player
                      audioUrl={useCreateBucketUrl(post.mp3_url ?? "")} //Handle undefined mp3_url
                      isPlaying={!!isPlaying[post.id]}
                      onPlay={() => setIsPlaying((prev) => ({ ...prev, [post.id]: true }))}
                      onPause={() => setIsPlaying((prev) => ({ ...prev, [post.id]: false }))}
                    />
                  </div>
                  <div className="absolute w-full h-[60px] bottom-1 justify-between pr-4">
                 {/*   <PostMainLikes post={{ ...post, id: post.id, profile: post.profile ?? {} } as PostWithProfile} /> Safe handling of profile*/}
                  </div>
                  <div className="absolute right-2 align-middle top-[30%]">
                    <button
                      className={`bg-[#272B43]/95 shadow-[0px_5px_5px_-10px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center rounded-xl px-3 py-4 text-[#818BAC] hover:text-white cursor-pointer ${
                        isLoading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      onClick={() => handleDownload(post)}
                      disabled={isLoading}
                    >
                      <img className="h-[18px] w-[18px]" src="/images/downloads.svg" alt="Download" />
                      <span className="text-[12px] mt-2 opacity-60">WAV</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p>Loading posts... or No paid posts found.</p>
          )}
        </>
      );
    }

export default PaidPosts;