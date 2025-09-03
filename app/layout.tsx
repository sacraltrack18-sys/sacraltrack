import UserProvider from './context/user';
import AllOverlays from "@/app/components/AllOverlays";
// import disableConsoleLogs from '@/app/utils/disableConsoleLog';
// disableConsoleLogs();
import { EditProvider } from './context/editContext';

// Disable console logs throughout the application
if (typeof window !== 'undefined') {
    // disableConsoleLogs();
}

import './globals.css';
import './styles/toast.css';
import { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { Suspense } from 'react';
import Background from '@/app/components/Background'; 
import { PlayerProvider } from '@/app/context/playerContext'; 
import LazyGlobalLoader from './components/lazy/LazyGlobalLoader'
import ClientWelcomeModal from './components/ClientWelcomeModal';
import Script from 'next/script';
import { OnboardingProvider } from './context/OnboardingContext';
import { ShareVibeProvider } from './components/vibe/useShareVibe';
import { useUser } from './context/user';
import AuthErrorHandler from './components/AuthErrorHandler';
import { clsx } from 'clsx';
import { inter } from '@/app/fonts/inter';
import YandexMetrika from './components/YandexMetrika';
import PerformanceMonitor from './components/PerformanceMonitor';
import ResourcePreloader from './components/ResourcePreloader';

export const metadata: Metadata = {
    title: 'Sacral Track',
    description: 'Sacral Track - music network marketplace for music artists and lovers. Listen to music, release a tracks, withdraw royalties to visa/mastercard.',
    metadataBase: new URL('https://sacraltrack.space'),
    icons: {
        icon: [
            { url: '/favicon.svg', type: 'image/svg+xml' },
            { url: '/favicon.ico', sizes: 'any' }
        ],
        apple: { url: '/apple-touch-icon.png' }
    },
    keywords: 'music, artist, marketplace, royalties, listen, release, tracks, streaming, pop, rock, hip hop, rap, electronic, EDM, classical, jazz, blues, country, R&B, soul, folk, indie, alternative, metal, punk, reggae, funk, disco, techno, house, ambient, lo-fi, trap, dubstep, trance, drum and bass, instrumental, vocal, beats, producers, musicians, songs, albums, singles, playlists, new music, trending',
    openGraph: {
        title: 'Sacral Track',
        description: 'Sacral Track - social network with marketplace for artists and music lovers',
        url: 'https://sacraltrack.space',
        images: [
            {
                url: '/images/sacraltrack.png',
                width: 800,
                height: 600,
                alt: 'Sacral Track',
            },
        ],
        type: 'website',
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                {/* Favicon links */}
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                
                {/* PWA Manifest */}
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#20DDBB" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                
                {/* SEO Keywords - дополнительные ключевые слова для поисковых систем */}
                <meta name="keywords" content="music marketplace, artist platform, music streaming, music genres, pop, rock, hip hop, rap, electronic, EDM, classical, jazz, blues, country, R&B, soul, folk, indie, alternative, metal, punk, reggae, funk, disco, techno, house, ambient, lo-fi, trap, dubstep, trance, drum and bass, instrumental, vocal, beats, producers, musicians, songs, albums, singles, playlists, new music, underground, independent music, royalties, music community" />
                
                {/* Дополнительные метаданные о музыкальных жанрах для структурированных данных */}
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
                    {
                        "@context": "https://schema.org",
                        "@type": "MusicDigitalPublicationSeries",
                        "name": "Sacral Track",
                        "description": "Music network and marketplace for artists and music lovers",
                        "url": "https://sacraltrack.space",
                        "genre": [
                            "Pop", "Rock", "Hip Hop", "Rap", "Electronic", "EDM", "Classical", 
                            "Jazz", "Blues", "Country", "R&B", "Soul", "Folk", "Indie", 
                            "Alternative", "Metal", "Punk", "Reggae", "Funk", "Disco", 
                            "Techno", "House", "Ambient", "Lo-Fi", "Trap", "Dubstep", 
                            "Trance", "Drum and Bass", "Instrumental"
                        ],
                        "offers": {
                            "@type": "Offer",
                            "description": "Access to music streaming and marketplace"
                        }
                    }
                `}} />
                
                {/* Preload critical resources */}
                <link 
                    rel="preload" 
                    href="/images/T-logo.svg" 
                    as="image" 
                    type="image/svg+xml"
                />
                
                {/* Preconnect to external domains */}
                <link rel="preconnect" href="https://mc.yandex.ru" />
                
                {/* Critical CSS inline - don't hide content */}
                <style dangerouslySetInnerHTML={{ __html: `
                    body { background: linear-gradient(60deg,#2E2469,#351E43); }
                    .bg-gradient { background: linear-gradient(60deg,#2E2469,#351E43); }
                    #TopNav { background: linear-gradient(60deg,#2E2469,#351E43); }
                ` }} />
            </head>
            <body className={clsx(inter.variable, 'bg-[#0F1122]')}>
                <LazyGlobalLoader />
                <Suspense fallback={<></>}>
                    <YandexMetrika />
                    <PerformanceMonitor />
                    <ResourcePreloader />
                </Suspense>
                {/*  <Background /> */}
                
                {/* SVG для градиентов иконок */}
                <svg width="0" height="0" className="absolute">
                    <defs>
                        <linearGradient id="fire-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ff8a00" />
                            <stop offset="30%" stopColor="#ff5e00" />
                            <stop offset="60%" stopColor="#ff3d00" />
                            <stop offset="100%" stopColor="#ff5e00" />
                            <animate attributeName="x1" from="0%" to="100%" dur="4s" repeatCount="indefinite" />
                            <animate attributeName="y1" from="0%" to="100%" dur="5s" repeatCount="indefinite" />
                            <animate attributeName="x2" from="100%" to="0%" dur="4s" repeatCount="indefinite" />
                            <animate attributeName="y2" from="100%" to="0%" dur="5s" repeatCount="indefinite" />
                        </linearGradient>
                    </defs>
                </svg>

       
                <PlayerProvider>
                    <UserProvider>
                        <OnboardingProvider>
                            <ShareVibeProvider appName="Sacral Track">
                                <EditProvider>
                                    <AuthErrorHandler>
                                        <Toaster
                                            position="top-center"
                                            containerStyle={{
                                                zIndex: 10000000,
                                                top: 80, // Позиционируем под TopNav
                                            }}
                                            toastOptions={{
                                                duration: 4000,
                                                style: {
                                                    background: 'linear-gradient(135deg, #1E1F2E 0%, #272B43 100%)',
                                                    color: '#fff',
                                                    borderRadius: '16px',
                                                    border: '1px solid rgba(32, 221, 187, 0.2)',
                                                    backdropFilter: 'blur(20px)',
                                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                                    padding: '16px 20px',
                                                    fontSize: '14px',
                                                    fontWeight: '500',
                                                    maxWidth: '90vw', // Адаптивная ширина для мобильных
                                                    minWidth: '280px', // Минимальная ширина
                                                    margin: '0 16px', // Отступы от краев экрана
                                                    zIndex: 10000000
                                                },
                                                // Unified success/error styles
                                                success: {
                                                    iconTheme: {
                                                        primary: '#20DDBB',
                                                        secondary: '#FFFAEE',
                                                    },
                                                    style: {
                                                        borderLeft: '4px solid #20DDBB'
                                                    }
                                                },
                                                error: {
                                                    iconTheme: {
                                                        primary: '#EF4444',
                                                        secondary: '#FFFAEE',
                                                    },
                                                    style: {
                                                        borderLeft: '4px solid #EF4444'
                                                    }
                                                },
                                                loading: {
                                                    iconTheme: {
                                                        primary: '#8A2BE2',
                                                        secondary: '#FFFAEE',
                                                    },
                                                    style: {
                                                        borderLeft: '4px solid #8A2BE2'
                                                    }
                                                },
                                            }}
                                        />
                                        <AllOverlays />
                                        {/* CALL Оборачиваем ClientWelcomeModal в client-only обертку с error boundary */}
                                        {typeof window !== 'undefined' && (
                                          <div suppressHydrationWarning>
                                            <ClientWelcomeModal />
                                          </div>
                                        )}
                                        {children}
                                    </AuthErrorHandler>
                                </EditProvider>
                            </ShareVibeProvider>
                        </OnboardingProvider>
                    </UserProvider>
                </PlayerProvider>
              
                
                {/* Use next/script for external scripts with strategy="afterInteractive" */}
                <Script id="yandex-metrika" strategy="afterInteractive">
                    {`
                    (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                    m[i].l=1*new Date();
                    for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
                    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
                    (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
                    ym(101742029, "init", {
                        defer: true,
                        clickmap: true,
                        trackLinks: true,
                        accurateTrackBounce: true
                    });
                    `}
                </Script>
                
                {/* Add noscript fallback for Yandex Metrika */}
                <noscript>
                    <div>
                        <img src="https://mc.yandex.ru/watch/101742029" style={{ position: 'absolute', left: '-9999px' }} alt="" />
                    </div>
                </noscript>
                
                {/* Добавляем скрипт для отключения Service Worker как клиентский скрипт */}
                <Script id="register-service-worker" strategy="afterInteractive">
                    {`
                    if ('serviceWorker' in navigator) {
                      window.addEventListener('load', function() {
                        navigator.serviceWorker.register('/sw.js', { scope: '/' })
                          .then(function(registration) {
                            console.log('🚀 ServiceWorker registered:', registration.scope);
                          })
                          .catch(function(error) {
                            console.log('❌ ServiceWorker registration failed:', error);
                          });
                      });
                    }
                    `}
                </Script>
            </body>
        </html>
    );
}

