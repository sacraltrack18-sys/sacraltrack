"use client";

import PostUser from "@/app/components/profile/PostUser";
import ProfileLayout from "@/app/layouts/ProfileLayout";
import { useEffect, useState, useRef, useCallback } from "react";
import { useUser } from "@/app/context/user";
import ClientOnly from "@/app/components/ClientOnly";
import { ProfileStore } from "@/app/types";
import { usePostStore } from "@/app/stores/post";
import { useProfileStore } from "@/app/stores/profile";
import { useGeneralStore } from "@/app/stores/general";
import { PostWithProfile } from "@/app/types";
// import PaidPosts from "@/app/components/profile/PaidPosts";

import useDownloadsStore from '@/app/stores/downloadsStore';
import React from 'react';
import { useParams } from "next/navigation";
import ProfileStatsCard from "@/app/components/ProfileStatsCard";
import { useFriendStore } from "@/app/stores/friendStore";
import { useLikedStore } from "@/app/stores/likedStore";
import { toast } from "react-hot-toast";

export default function ProfileClientComponent() {
  const params = useParams();
  const userId = (params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : "") as string;
  
  const [visiblePosts, setVisiblePosts] = useState<PostWithProfile[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const postsPerPage = 5;

  const contextUser = useUser();
  const { postsByUser, setPostsByUser } = usePostStore();
  const { setCurrentProfile, currentProfile } = useProfileStore();
  const { isEditProfileOpen, setIsEditProfileOpen } = useGeneralStore();

  const { showPaidPosts, hidePostUser } = useDownloadsStore();

  const observer = useRef<IntersectionObserver | null>(null);
  const lastPostRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && visiblePosts.length < postsByUser.length) {
        setPage(prev => prev + 1);
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, postsByUser.length, visiblePosts.length]);

  const { friends, pendingRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend } = useFriendStore();
  const { likedPosts } = useLikedStore();
  const [isLoading, setIsLoading] = useState(false);

  const isFriend = friends.some(friend => friend.friend_id === userId);
  const pendingRequest = pendingRequests.find(
    req => (req.friend_id === userId || req.user_id === userId) && req.id
  );

  // Вычисление ранга и рейтинга
  const friendsCount = friends.length;
  const tracksCount = postsByUser.length;
  const likesCount = likedPosts?.length || 0;
  const totalScore = friendsCount * 10 + tracksCount * 15 + likesCount * 5;
  let rankName = 'Novice';
  if (totalScore >= 500) rankName = 'Legend';
  else if (totalScore >= 300) rankName = 'Master';
  else if (totalScore >= 150) rankName = 'Advanced';
  else if (totalScore >= 50) rankName = 'Experienced';

  const handleFriendAction = async (action?: 'accept' | 'reject' | 'reset') => {
    if (!contextUser?.user) {
      toast.error("Please log in to add friends");
      return;
    }

    const user = contextUser.user; // Сохраняем ссылку на user, чтобы избежать проверок на null

    try {
      setIsLoading(true);
      
      // Оптимистичное обновление UI
      const optimisticUpdate = () => {
        if (isFriend) {
          // Оптимистично удаляем из друзей
          useFriendStore.setState(state => ({
            ...state,
            friends: state.friends.filter(f => f.friend_id !== userId)
          }));
        } else if (pendingRequest && pendingRequest.id) {
          if (action === 'accept') {
            // Оптимистично добавляем в друзья
            const newFriend = {
              id: pendingRequest.id,
              user_id: user.id,
              friend_id: userId,
              status: 'accepted' as const,
              created_at: new Date().toISOString()
            };

            useFriendStore.setState(state => ({
              ...state,
              friends: [...state.friends, newFriend],
              pendingRequests: state.pendingRequests.filter(req => req.id !== pendingRequest.id)
            }));
          } else if (action === 'reject' || action === 'reset') {
            // Оптимистично удаляем запрос
            useFriendStore.setState(state => ({
              ...state,
              pendingRequests: state.pendingRequests.filter(req => req.id !== pendingRequest.id)
            }));
          }
        } else {
          // Оптимистично добавляем запрос в ожидании
          const tempRequest = {
            id: 'temp-' + Date.now(),
            user_id: user.id,
            friend_id: userId,
            status: 'pending' as const,
            created_at: new Date().toISOString()
          };
          
          useFriendStore.setState(state => ({
            ...state,
            pendingRequests: [...state.pendingRequests, tempRequest]
          }));
        }
      };

      // Применяем оптимистичное обновление
      optimisticUpdate();

      if (isFriend) {
        await removeFriend(userId);
      } else if (pendingRequest && pendingRequest.id) {
        if (action === 'accept') {
          await acceptFriendRequest(pendingRequest.id);
        } else if (action === 'reject' || action === 'reset') {
          await rejectFriendRequest(pendingRequest.id);
        } else if (pendingRequest.user_id === user.id) {
          await rejectFriendRequest(pendingRequest.id);
        } else {
          await acceptFriendRequest(pendingRequest.id);
        }
      } else {
        await sendFriendRequest(user.id, userId);
      }
    } catch (error) {
      console.error('Friend action error:', error);
      toast.error(
        error?.message
          ? `Friend request error: ${error.message}`
          : 'Failed to process friend request. Please try again.'
      );
      // В случае ошибки отменяем оптимистичное обновление путем обновления данных с сервера
      // Здесь можно добавить обновление данных с сервера
      // Например: await loadFriends(user.id);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Принудительно загружаем профиль и посты для конкретного пользователя
    console.log(`[ProfileClientComponent] Loading profile and posts for user: ${userId}`);
    setCurrentProfile(userId);
    setPostsByUser(userId);
  }, [userId, setCurrentProfile, setPostsByUser]);

  useEffect(() => {
    if (postsByUser.length > 0) {
      const endIndex = page * postsPerPage;
      const newPosts = postsByUser.slice(0, endIndex).map(post => ({
        ...post,
        profile: post.profile || { user_id: post.user_id, name: '', image: '' }
      }));
      setVisiblePosts(newPosts);
    }
  }, [page, postsByUser]);

  return (
    <>
      {/* ProfileStatsCard справа сверху только для чужого профиля и только на десктопе */}
      {contextUser?.user?.id !== userId && currentProfile && (
        <ProfileStatsCard
          stats={{
            releases: postsByUser.length,
            likes: likesCount,
            listens: 0,
            liked: 0,
          }}
          isFriend={isFriend}
          pendingRequest={pendingRequest}
          isLoading={isLoading}
          onFriendAction={handleFriendAction}
        />
      )}
      <ProfileLayout 
        params={{ params: { id: userId } }}
        isFriend={isFriend}
        pendingRequest={pendingRequest}
        isLoading={isLoading}
        onFriendAction={contextUser?.user?.id !== userId ? handleFriendAction : undefined}
      >
      <div className="pt-[90px] lg:pr-0 w-full max-w-[1200px] px-[10px] sm:px-0">
        <ClientOnly>
          {!hidePostUser && (
            <div className="justify center">
              {visiblePosts.map((post, index) => (
                <div 
                  key={post.id} 
                  ref={index === visiblePosts.length - 1 ? lastPostRef : null}
                >
                  <PostUser
                    params={{ userId: userId, postId: post.id }}
                    post={post}
                    userId={userId}
                  />
                </div>
              ))}
            </div>
          )}
        </ClientOnly>

       
          {showPaidPosts && (
            <div className="mt-4">
            {/*  <PaidPosts userId={userId} /> */}
            </div>
          )}

          <div className="pb-20" />
        </div>
      </ProfileLayout>
    </>
  );
} 