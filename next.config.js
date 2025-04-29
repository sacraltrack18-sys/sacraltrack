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
                source: '/((?!upload|api/audio).*)',
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
                    },
                    // Изменяем для поддержки загрузки изображений
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin'
                    },
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'credentialless'
                    },
                    {
                        key: 'Cross-Origin-Resource-Policy',
                        value: 'cross-origin'
                    }
                ]
            },
            // Настройки для страницы upload и вложенных маршрутов с использованием credentialless
            {
                source: '/upload/:path*',
                headers: [
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin'
                    },
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'require-corp'
                    },
                    {
                        key: 'Cache-Control',
                        value: 'no-store, max-age=0'
                    },
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
            // Отдельно для корневого пути /upload также с credentialless
            {
                source: '/upload',
                headers: [
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin'
                    },
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'require-corp'
                    },
                    {
                        key: 'Cache-Control',
                        value: 'no-store, max-age=0'
                    },
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
                    },
                    {
                        key: 'Cross-Origin-Resource-Policy',
                        value: 'cross-origin'
                    }
                ]
            },
            // Аналогично для API аудио-маршрутов также с credentialless
            {
                source: '/api/audio/:path*',
                headers: [
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin'
                    },
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'require-corp'
                    },
                    {
                        key: 'Cache-Control',
                        value: 'no-store, max-age=0'
                    },
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
                    },
                    {
                        key: 'Cross-Origin-Resource-Policy',
                        value: 'cross-origin'
                    }
                ]
            },
            // Настройки для API платежных маршрутов - Stripe
            {
                source: '/api/checkout_sessions',
                headers: [
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'unsafe-none'
                    },
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'unsafe-none'
                    },
                    {
                        key: 'Cache-Control',
                        value: 'no-store, max-age=0'
                    },
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
                        value: 'X-Requested-With, Content-Type, Authorization, stripe-signature, Origin'
                    },
                    {
                        key: 'Cross-Origin-Resource-Policy',
                        value: 'cross-origin'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'no-referrer-when-downgrade'
                    }
                ]
            },
            // Настройки для API проверки платежей
            {
                source: '/api/verify_payment',
                headers: [
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin'
                    },
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'credentialless'
                    },
                    {
                        key: 'Cache-Control',
                        value: 'no-store, max-age=0'
                    },
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: '*'
                    },
                    {
                        key: 'Access-Control-Allow-Methods',
                        value: 'GET, POST, OPTIONS'
                    },
                    {
                        key: 'Access-Control-Allow-Headers',
                        value: 'X-Requested-With, Content-Type, Authorization'
                    },
                    {
                        key: 'Cross-Origin-Resource-Policy',
                        value: 'cross-origin'
                    }
                ]
            },
            // Настройки для Stripe webhook и связанных API
            {
                source: '/api/stripe/:path*',
                headers: [
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin'
                    },
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'credentialless'
                    },
                    {
                        key: 'Cache-Control',
                        value: 'no-store, max-age=0'
                    },
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: '*'
                    },
                    {
                        key: 'Access-Control-Allow-Methods',
                        value: 'GET, POST, OPTIONS'
                    },
                    {
                        key: 'Access-Control-Allow-Headers',
                        value: 'X-Requested-With, Content-Type, Authorization, stripe-signature'
                    },
                    {
                        key: 'Cross-Origin-Resource-Policy',
                        value: 'cross-origin'
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