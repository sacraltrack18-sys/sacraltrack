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
            }
        ],
    },
    // Optimize for production
    reactStrictMode: true,
    productionBrowserSourceMaps: false,
    output: 'standalone',
    trailingSlash: false,
    // External packages for server components
    serverExternalPackages: ['@ffmpeg/core', '@ffmpeg/ffmpeg'],
    // CORS and security headers
    async headers() {
        return [
            // Основные заголовки CORS для всех страниц
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: '*'
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
                ),
                // Exclude canvas from server build to avoid native compilation errors
                'canvas'
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
        
        return config;
    },
};

module.exports = nextConfig;