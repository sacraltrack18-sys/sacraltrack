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
import useGetUserPurchases from '@/app/hooks/useGetUserPurchases';
import { usePostStore } from '@/app/stores/post';
import PostUser from './PostUser';

interface PaidPostsProps {
  userId: string;
}

const PaidPosts = ({ userId }: PaidPostsProps) => {
  const [purchasedPosts, setPurchasedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { getUserPurchases } = useGetUserPurchases();
  const { allPosts } = usePostStore();

  useEffect(() => {
    const fetchPurchasedPosts = async () => {
      try {
        setLoading(true);
        // Получаем все покупки пользователя
        const purchases = await getUserPurchases(userId);
        
        // Получаем ID купленных треков
        const purchasedTrackIds = purchases.map(purchase => purchase.track_id);
        
        // Фильтруем посты, оставляя только купленные
        const purchasedPostsData = allPosts.filter(post => 
          purchasedTrackIds.includes(post.id)
        );

        setPurchasedPosts(purchasedPostsData);
        } catch (error) {
        console.error('Error fetching purchased posts:', error);
        } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchPurchasedPosts();
    }
  }, [userId, allPosts]);

  if (loading) {
    return <div className="text-white text-center">Loading...</div>;
  }

  if (!purchasedPosts.length) {
    return <div className="text-white text-center">No purchased tracks yet</div>;
              }
      
              return (
    <div className="grid gap-4">
      {purchasedPosts.map((post) => (
        <PostUser key={post.id} post={post} />
      ))}
                </div>
              );
};

export default PaidPosts;