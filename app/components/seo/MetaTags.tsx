import { Metadata } from 'next';
import { ReactNode } from 'react';

interface MetaTagsProps {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'music.song' | 'profile';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  children?: ReactNode;
}

export function generateMetadata({
  title,
  description,
  keywords,
  image = '/images/sacraltrack-og.png',
  url,
  type = 'website',
  author,
  publishedTime,
  modifiedTime
}: MetaTagsProps): Metadata {
  const baseUrl = 'https://sacraltrack.space';
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl;
  const fullTitle = title === 'Sacral Track' ? title : `${title} | Sacral Track`;

  const metadata: Metadata = {
    title: fullTitle,
    description,
    keywords,
    authors: author ? [{ name: author }] : undefined,
    openGraph: {
      title: fullTitle,
      description,
      url: fullUrl,
      siteName: 'Sacral Track',
      images: [
        {
          url: image.startsWith('http') ? image : `${baseUrl}${image}`,
          width: 1200,
          height: 630,
          alt: title,
        }
      ],
      locale: 'en_US',
      type: type as any,
      publishedTime,
      modifiedTime,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image.startsWith('http') ? image : `${baseUrl}${image}`],
      creator: '@SacralTrack',
      site: '@SacralTrack',
    },
    alternates: {
      canonical: fullUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };

  return metadata;
}

// Структурированные данные для музыкального контента
export function generateMusicSchema({
  name,
  description,
  url,
  image,
  artist,
  album,
  genre,
  duration,
  datePublished
}: {
  name: string;
  description?: string;
  url: string;
  image?: string;
  artist?: string;
  album?: string;
  genre?: string;
  duration?: string;
  datePublished?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name,
    description,
    url,
    image,
    byArtist: artist ? {
      '@type': 'Person',
      name: artist
    } : undefined,
    inAlbum: album ? {
      '@type': 'MusicAlbum',
      name: album
    } : undefined,
    genre,
    duration,
    datePublished,
    publisher: {
      '@type': 'Organization',
      name: 'Sacral Track',
      logo: 'https://sacraltrack.space/images/logo.png'
    }
  };
}

// Структурированные данные для артиста
export function generateArtistSchema({
  name,
  description,
  url,
  image,
  genre,
  memberOf
}: {
  name: string;
  description?: string;
  url: string;
  image?: string;
  genre?: string[];
  memberOf?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': memberOf ? 'MusicGroup' : 'Person',
    name,
    description,
    url,
    image,
    genre,
    memberOf: memberOf ? {
      '@type': 'Organization',
      name: memberOf
    } : undefined,
    mainEntityOfPage: {
      '@type': 'ProfilePage',
      url
    }
  };
}

// Хлебные крошки
export function generateBreadcrumbSchema(items: Array<{name: string, url: string}>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://sacraltrack.space${item.url}`
    }))
  };
}
