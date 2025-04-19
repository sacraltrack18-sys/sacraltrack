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
    // Configure output file tracing - важно для Netlify
    output: 'standalone',
    // Настройка для предотвращения проблем с 404
    trailingSlash: false,
    // External packages for server components
    serverExternalPackages: ['@ffmpeg/core', '@ffmpeg/ffmpeg'],
    experimental: {
        // Enable optimizations when possible
        optimizeCss: true,
        // Experimental features
        scrollRestoration: true,
    },
    // Добавляем явное правило для API роутов
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: '/api/:path*',
            },
        ];
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
    webpack(config, { isServer, nextRuntime }) {
        // Configure WebAssembly support
        config.experiments = {
            ...config.experiments,
            asyncWebAssembly: true,
            syncWebAssembly: true,
            topLevelAwait: true,
            layers: true,
        };
        
        // Configure rules for FFmpeg WASM files
        config.module.rules.push({
            test: /\.wasm$/,
            type: 'asset/resource',
        });

        // Add aliases for correct FFmpeg module loading
        config.resolve.alias = {
            ...config.resolve.alias,
            '@ffmpeg/core': require.resolve('@ffmpeg/core'),
            '@ffmpeg/ffmpeg': require.resolve('@ffmpeg/ffmpeg'),
        };
        
        // Set WASM module filename format for server components
        if (isServer && nextRuntime === 'nodejs') {
            config.output.webassemblyModuleFilename = 'chunks/[id].wasm';
            // Allow FFmpeg core to be bundled with Node.js
            config.externals = [
                ...config.externals.filter(external => 
                    !(typeof external === 'string' && 
                      (external.includes('@ffmpeg/core') || external.includes('@ffmpeg/ffmpeg')))
                )
            ];
        }
        
        // For client side, ensure WASM modules are properly handled
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                path: false,
                os: false,
                crypto: false,
            };
        }
        
        // Optimize chunk splitting
        config.optimization.splitChunks = {
            chunks: 'all',
            maxInitialRequests: 25,
            minSize: 20000,
            maxSize: 500000, // Setting max chunk size to avoid oversized chunks
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
        // Check types during build
        ignoreBuildErrors: false,
    },
};

module.exports = nextConfig;