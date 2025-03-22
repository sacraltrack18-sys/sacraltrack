"use client";

import PostUser from "@/app/components/profile/PostUser";
import ProfileLayout from "@/app/layouts/ProfileLayout";
import { useEffect, useState, useRef, useCallback } from "react";
import { useUser } from "@/app/context/user";
import ClientOnly from "@/app/components/ClientOnly";
import { ProfilePageTypes, ProfileStore } from "@/app/types";
import { usePostStore } from "@/app/stores/post";
import { useProfileStore } from "@/app/stores/profile";
import { useGeneralStore } from "@/app/stores/general";
import { PostWithProfile } from "@/app/types";
import PaidPosts from "@/app/components/profile/PaidPosts";
import ProfileComponents from "@/app/layouts/includes/ProfileComponents";
import useDownloadsStore from '@/app/stores/downloadsStore';

export default function Profile({ params }: ProfilePageTypes) {
  const [visiblePosts, setVisiblePosts] = useState<PostWithProfile[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const postsPerPage = 5;

  const contextUser = useUser()
  const { postsByUser, setPostsByUser } = usePostStore()
  const { setCurrentProfile, currentProfile } = useProfileStore()
  const { isEditProfileOpen, setIsEditProfileOpen } = useGeneralStore()

  const { showPaidPosts, hidePostUser } = useDownloadsStore();

  const observer = useRef<IntersectionObserver>();
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

  useEffect(() => {
    setCurrentProfile(params?.id)
    setPostsByUser(params?.id)
  }, [params.id, setCurrentProfile]);

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
      <ProfileLayout params={{ params }}>
      <div className="pt-[90px] lg:pr-0 w-full max-w-[1200px] ">
        <ClientOnly>
          {!hidePostUser && (
            <div className="justify center">
              {visiblePosts.map((post, index) => (
                <div 
                  key={post.id} 
                  ref={index === visiblePosts.length - 1 ? lastPostRef : null}
                >
                  <PostUser
                    params={{ userId: params.id, postId: post.id }}
                    post={post}
                    userId={params.id}
                  />
                </div>
              ))}
            </div>
          )}
        </ClientOnly>

       
          {showPaidPosts && (
            <div className="mt-4">
            {/*  <PaidPosts userId={params.id} /> */}
            </div>
          )}

          <div className="pb-20" />
        </div>
      </ProfileLayout>
    </>
  );
}