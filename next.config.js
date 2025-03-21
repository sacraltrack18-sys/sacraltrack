/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['localhost', 'sacraltrack.space', 'cloud.appwrite.io'],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
            {
                protocol: 'http',
                hostname: '**',
            },
            {
                protocol: 'https',
                hostname: 'sacraltrack.space',
            },
            {
                protocol: 'https',
                hostname: '*.netlify.app',
            },
            {
                protocol: 'https',
                hostname: 'cloud.appwrite.io',
            }
        ],
        unoptimized: process.env.NODE_ENV === 'development'
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: 'https://sacraltrack.space, https://cloud.appwrite.io, https://*.netlify.app'
                    },
                    {
                        key: 'Access-Control-Allow-Methods',
                        value: 'GET, POST, PUT, DELETE, OPTIONS'
                    },
                    {
                        key: 'Access-Control-Allow-Headers',
                        value: 'X-Requested-With, Content-Type, Authorization'
                    }
                ]
            }
        ]
    }
};

module.exports = nextConfig;