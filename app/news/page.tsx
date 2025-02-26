"use client";
import { useEffect } from "react";
import NewsLayout from "../layouts/MainLayout";
import NewsCard from "../components/news/NewsCard";
import { useNewsStore } from "@/app/stores/newsStore";
import ClientOnly from "../components/ClientOnly";
import Banner from "../components/ads/Banner";

export default function News() {
    const { allNews, setAllNews, isLoading, error } = useNewsStore();

    useEffect(() => {
        const fetchNews = async () => {
            try {
                await setAllNews();
            } catch (error) {
                console.error("Error fetching news:", error);
            }
        };

        fetchNews();
    }, [setAllNews]);

    if (isLoading) {
        return <NewsLayout><p>Loading news...</p></NewsLayout>;
    }
    if (error) {
        return <NewsLayout><p>Error loading news: {error}</p></NewsLayout>;
    }

    return (
        <NewsLayout>
            <div className="fixed top-[80px] z-20 left-5">
            <Banner adKey="86d3fb485da9c74e8f7f931cda88b7de" adFormat="iframe" adHeight={250} adWidth={300} />
            </div>

            <div className="mt-[80px] w-full max-w-[690px] ml-auto" style={{ display: 'flex', flexWrap: 'wrap' }}>
                <ClientOnly>
                    {allNews.map((news) => (
                        <NewsCard key={news.postid} news={news} />
                    ))}
                </ClientOnly>
            </div>
        </NewsLayout>
    );
}
