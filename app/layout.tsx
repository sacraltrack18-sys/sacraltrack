import UserProvider from './context/user';
import AllOverlays from "@/app/components/AllOverlays";
import './globals.css';
import { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { Suspense } from 'react';
import Background from '@/app/components/Background'; 
import { PlayerProvider } from '@/app/context/playerContext'; 
import GlobalLoader from './components/GlobalLoader'
import ClientWelcomeModal from './components/ClientWelcomeModal';
import Script from 'next/script';
import { OnboardingProvider } from './context/OnboardingContext';
import { ShareVibeProvider } from './components/vibe/useShareVibe';
import { useUser } from './context/user';
import AuthErrorHandler from './components/AuthErrorHandler';
import { clsx } from 'clsx';
import { inter } from '@/app/fonts/inter';

export const metadata: Metadata = {
    title: 'Sacral Track',
    description: 'Sacral Track - music network marketplace for music artists and lovers. Listen to music, release a tracks, withdraw royalties to visa/mastercard.',
    metadataBase: new URL('https://sacraltrack.store'),
    icons: {
        icon: [
            { url: '/favicon.svg', type: 'image/svg+xml' },
            { url: '/favicon.ico', sizes: 'any' }
        ],
        apple: { url: '/apple-touch-icon.png' }
    },
    openGraph: {
        title: 'Sacral Track',
        description: 'Sacral Track - music network marketplace for music artists and lovers',
        url: 'https://sacraltrack.store',
        images: [
            {
                url: '/images/log.png',
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
                <GlobalLoader />
                <Suspense fallback={<></>}>
                {/*    <YandexMetrika /> */}
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
                                <AuthErrorHandler>
                                    <Toaster
                                        position="top-center"
                                        containerStyle={{
                                            zIndex: 10000000
                                        }}
                                        toastOptions={{
                                            duration: 5000,
                                            style: {
                                                background: '#272B43',
                                                color: '#fff',
                                                zIndex: 10000000
                                            },
                                            // Custom success/error styles
                                            success: {
                                                iconTheme: {
                                                    primary: '#8B5CF6',
                                                    secondary: '#FFFAEE',
                                                },
                                                style: {
                                                    borderLeft: '4px solid #20DDBB',
                                                    background: '#272B43',
                                                    color: '#fff'
                                                }
                                            },
                                            error: {
                                                iconTheme: {
                                                    primary: '#EF4444',
                                                    secondary: '#FFFAEE',
                                                },
                                                style: {
                                                    borderLeft: '4px solid #EF4444', 
                                                    background: '#272B43',
                                                    color: '#fff'
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
                    ym(98093904, "init", {
                        clickmap: true,
                        trackLinks: true,
                        accurateTrackBounce: true
                    });
                    `}
                </Script>
                
                {/* Add noscript fallback for Yandex Metrika */}
                <noscript>
                    <div>
                        <img src="https://mc.yandex.ru/watch/98093904" style={{ position: 'absolute', left: '-9999px' }} alt="" />
                    </div>
                </noscript>
                
                {/* Добавляем скрипт для отключения Service Worker как клиентский скрипт */}
                <Script id="disable-service-worker" strategy="afterInteractive">
                    {`
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.getRegistrations().then(function(registrations) {
                        registrations.forEach(registration => {
                          registration.unregister();
                          console.log('ServiceWorker unregistered');
                        });
                      }).catch(error => {
                        console.error('Error unregistering service worker:', error);
                      });
                    }
                    `}
                </Script>
            </body>
        </html>
    );
}

