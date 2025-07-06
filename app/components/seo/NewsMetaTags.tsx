"use client";

import Head from 'next/head';
import { NewsItem } from "@/app/stores/newsStore";
import { getAppwriteImageUrl } from "@/app/utils/appwriteImageUrl";

interface NewsMetaTagsProps {
  news: NewsItem;
}

const NewsMetaTags: React.FC<NewsMetaTagsProps> = ({ news }) => {
  const title = news.name || "Untitled News";
  const description = news.description || "No description available";
  const imageUrl = news.img_url ? getAppwriteImageUrl(news.img_url) : "/default-news-image.jpg";
  const url = `https://sacraltrack.com/news/${news.$id}`;
  const siteName = "SacralTrack";

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title} | SacralTrack News</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={`music news, ${title}, SacralTrack, music industry, ${news.author || 'music'}`} />
      <meta name="author" content={news.author || "SacralTrack News"} />
      <link rel="canonical" href={url} />

      {/* Open Graph Meta Tags */}
      <meta property="og:type" content="article" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:alt" content={`${title} - SacralTrack News`} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />
      
      {/* Article specific Open Graph tags */}
      <meta property="article:published_time" content={news.created} />
      <meta property="article:modified_time" content={news.created} />
      <meta property="article:author" content={news.author || "SacralTrack News"} />
      <meta property="article:section" content="Music News" />
      <meta property="article:tag" content="music" />
      <meta property="article:tag" content="news" />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@SacralTrack" />
      <meta name="twitter:creator" content="@SacralTrack" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={`${title} - SacralTrack News`} />

      {/* Additional SEO Meta Tags */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <meta name="bingbot" content="index, follow" />
      
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            "headline": title,
            "description": description,
            "image": {
              "@type": "ImageObject",
              "url": imageUrl,
              "width": 1200,
              "height": 630
            },
            "datePublished": news.created,
            "dateModified": news.created,
            "author": {
              "@type": "Person",
              "name": news.author || "SacralTrack News"
            },
            "publisher": {
              "@type": "Organization",
              "name": siteName,
              "logo": {
                "@type": "ImageObject",
                "url": "https://sacraltrack.com/logo.png",
                "width": 200,
                "height": 60
              }
            },
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": url
            },
            "url": url,
            "interactionStatistic": {
              "@type": "InteractionCounter",
              "interactionType": "https://schema.org/LikeAction",
              "userInteractionCount": news.likes || 0
            },
            "keywords": `music news, ${title}, SacralTrack, music industry`,
            "articleSection": "Music News",
            "inLanguage": "en-US"
          })
        }}
      />
    </Head>
  );
};

export default NewsMetaTags;
