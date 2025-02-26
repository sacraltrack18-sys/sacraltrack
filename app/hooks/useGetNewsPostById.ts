import { useEffect, useState } from 'react';
import { NewsItem } from '@/app/stores/newsStore';

const useGetNewsPostById = (slug?: string) => {
    const [news, setNews] = useState<NewsItem | null>(null);

    useEffect(() => {
        const fetchNews = async () => {
            if (slug) {
                // Fetch news by slug
                const response = await fetch(`/api/news/${slug}`);
                const data = await response.json();
                console.log('Fetched news data:', data); // Log the response
                setNews(data);
            }
        };

        fetchNews();
    }, [slug]);

    return news;
};

export default useGetNewsPostById; 