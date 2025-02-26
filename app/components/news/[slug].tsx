import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { NewsItem } from '@/app/stores/newsStore'; // Use named import
import useGetNewsPostById from '@/app/hooks/useGetNewsPostById'; // Import your hook

interface NewsPageProps {
    news: NewsItem | null;
}


export const getStaticPaths: GetStaticPaths = async () => {
    const newsItems = await useGetNewsPostById(); // Fetch all news items

    if (!newsItems || !Array.isArray(newsItems)) return { paths: [], fallback: 'blocking' }; // Handle null or non-array case

    const paths = newsItems.map((item) => ({
        params: { slug: item.postid },
    }));
    return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps<NewsPageProps> = async ({ params }) => {
    const slug = params?.slug as string; // Type assertion
    const news = await useGetNewsPostById(slug); // This should return a single NewsItem or null
    return { props: { news } }; // This matches the NewsPageProps interface
};

const NewsPage: React.FC<NewsPageProps> = ({ news }) => {
    if (!news) return <p>News not found</p>; //Handle missing news
    const { name, description, img_url, author, created, likes } = news;

    return (
        <>
            <Head>
                <title>{name} - Your News Website</title>
                <meta name="description" content={description} />
                <meta property="og:image" content={img_url} />
                {/* Add other meta tags as needed */}
            </Head>
            <h1>{name}</h1>
            <p>By: {author} | {created}</p>
            <img src={img_url} alt={name} />
            <p>{description}</p>
            <p>Likes: {likes}</p>
        </>
    );
};

export default NewsPage;

