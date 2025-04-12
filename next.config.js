/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
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
    // Optimize JS and CSS files
    compiler: {
        // Remove console.log in production
        removeConsole: process.env.NODE_ENV === 'production' ? {
            exclude: ['error', 'warn'],
        } : false,
    },
    // Enable gzip compression
    compress: true,
    // Optimize bundle size for production
    reactStrictMode: true,
    // Cache build outputs for faster rebuilds
    productionBrowserSourceMaps: false,
    // Configure output file tracing
    output: 'standalone',
    experimental: {
        // Enable optimizations when possible
        optimizeCss: true,
        // Experimental features
        scrollRestoration: true,
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
            },
            // Cache static assets
            {
                source: '/images/(.*)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable'
                    }
                ]
            },
            {
                source: '/_next/static/(.*)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable'
                    }
                ]
            },
            {
                source: '/api/(.*)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-store, max-age=0'
                    }
                ]
            }
        ]
    },
    // Configure webpack to optimize bundle size
    webpack(config, { isServer }) {
        // Optimize chunk size
        config.optimization.splitChunks = {
            chunks: 'all',
            maxInitialRequests: 25,
            minSize: 20000,
            cacheGroups: {
                defaultVendors: {
                    test: /[\\/]node_modules[\\/]/,
                    priority: -10,
                    reuseExistingChunk: true,
                },
                stripe: {
                    test: /[\\/]node_modules[\\/](@stripe|stripe)[\\/]/,
                    name: 'stripe-vendor',
                    priority: 10,
                    reuseExistingChunk: true,
                },
                commons: {
                    name: 'commons',
                    minChunks: 2,
                    priority: -20,
                    reuseExistingChunk: true,
                },
            },
        };
        
        return config;
    },
    // Enable type checking during builds
    typescript: {
        // Проверять типы при сборке
        ignoreBuildErrors: false,
    },
};

module.exports = nextConfig;