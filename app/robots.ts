import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Allow all crawlers to access public content
      {
        userAgent: '*',
        allow: [
          '/',
          '/upload',
          '/people',
          '/news',
          '/terms',
          '/stickers'
        ],
        disallow: [
          '/api/*',
          '/admin/*',
          '/auth/*',
          '/profile/*',
          '/royalty/*',
          '/_next/*',
          '/static/*',
          '/temp/*',
          '/private/*',
          '/*.json$',
          '/*.mp3$',
          '/*.wav$',
          '/*.ts$',
          '/*.m3u8$',
          '/storage/*'
        ],
        crawlDelay: 1
      },
      // Special rules for search engines
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/*', '/admin/*', '/auth/*', '/profile/*', '/royalty/*'],
        crawlDelay: 0
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/api/*', '/admin/*', '/auth/*', '/profile/*', '/royalty/*'],
        crawlDelay: 1
      },
      // Block AI crawlers from training data
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'CCBot',
          'anthropic-ai',
          'Claude-Web'
        ],
        disallow: '/'
      }
    ],
    sitemap: 'https://sacraltrack.space/sitemap.xml',
    host: 'https://sacraltrack.space',
  }
} 