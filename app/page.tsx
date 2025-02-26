"use client"

import { useEffect } from "react"
import { usePostStore } from "@/app/stores/post"
import ClientOnly from "./components/ClientOnly"
import PostMain from "./components/PostMain"
import { GenreProvider } from "@/app/context/GenreContext";
import { useRouter } from "next/navigation";
import React, { Suspense } from "react";
import { useInView } from 'react-intersection-observer';
import MainLayout from "./layouts/MainLayout"

export default function Home() {
  const router = useRouter();
  
  const { 
    allPosts, 
    loadMorePosts,
    setAllPosts, 
    isLoading, 
    hasMore,
    selectedGenre 
  } = usePostStore();

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '400px',
  });

  // Начальная загрузка
  useEffect(() => {
    if (allPosts.length === 0) {
      setAllPosts();
    }
  }, [selectedGenre]); // Добавляем зависимость от жанра

  // Загрузка следующей порции постов при прокрутке
  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      loadMorePosts();
    }
  }, [inView, hasMore, isLoading]);

  // Фильтрация постов теперь происходит в store
  const filteredPosts = allPosts;

  return (
    <>
      <GenreProvider>
        <MainLayout>
          <div className="mt-[80px] w-full ml-auto">
            <ClientOnly>
              <Suspense fallback={<div>Loading...</div>}>
                {filteredPosts.map((post, index) => {
                  const uniqueKey = `${post.id}-${index}`; // Создаем уникальный ключ
                  return (
                    <div 
                      key={uniqueKey}
                      ref={index === filteredPosts.length - 1 ? ref : undefined}
                    >
                      <PostMain
                        post={post}
                        router={router}
                        id={post.id}
                        user_id={post.user_id}
                        audio_url={post.audio_url}
                        image_url={post.image_url}
                        price={post.price}
                        mp3_url={post.mp3_url}
                        m3u8_url={post.m3u8_url}
                        text={post.text}
                        trackname={post.trackname}
                        created_at={post.created_at}
                        genre={post.genre}
                        profile={{
                          user_id: post.profile.user_id,
                          name: post.profile.name,
                          image: post.profile.image
                        }}
                      />
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex justify-center py-4">
                    <div className="w-8 h-8 border-t-2 border-[#20DDBB] rounded-full animate-spin"></div>
                  </div>
                )}

                {!hasMore && filteredPosts.length > 0 && (
                  <div className="text-center text-[#818BAC] py-4">
                    No more tracks to load
                  </div>
                )}
              </Suspense>
            </ClientOnly>
          </div>
        </MainLayout>
      </GenreProvider>
    </>
  );
}