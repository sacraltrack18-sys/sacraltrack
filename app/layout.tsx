import UserProvider from './context/user';
import AllOverlays from "@/app/components/AllOverlays";
import './globals.css';
import { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { GlobalProvider } from './globalProvider';
import { CartProvider } from './context/CartContext';
import { Suspense } from 'react';
import Background from '@/app/components/Background'; 
import { PlayerProvider } from '@/app/context/playerContext'; 
import GlobalLoader from './components/GlobalLoader'
import WelcomeModal from './components/WelcomeModal';

export const metadata: Metadata = {
    title: 'Sacral Track',
    description: 'Sacral Track - music network marketplace for music artists and lovers. Listen to music, release a tracks, withdraw royalties to visa/mastercard.',
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
                <script 
                    async 
                    src="https://mc.yandex.ru/watch/98093904"
                    type="text/javascript"
                />
            </head>
            <body className="bg-[linear-gradient(60deg,#2E2469,#351E43)] text-white">
                <GlobalLoader />
                <Suspense fallback={<></>}>
                {/*    <YandexMetrika /> */}
                </Suspense>
                <Background />
                
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

                <GlobalProvider>
                <PlayerProvider>
                    <UserProvider>
                        <CartProvider>
                            <Toaster 
                                position="top-center"
                                containerStyle={{
                                    zIndex: 10000000
                                }}
                                toastOptions={{
                                    duration: 3000,
                                    style: {
                                        background: '#272B43',
                                        color: '#fff',
                                        zIndex: 10000000
                                    },
                                    success: {
                                        iconTheme: {
                                            primary: '#8B5CF6',
                                            secondary: '#FFFAEE',
                                        },
                                    },
                                    error: {
                                        iconTheme: {
                                            primary: '#EF4444',
                                            secondary: '#FFFAEE',
                                        },
                                    },
                                }}
                            />
                            <AllOverlays />
                            <WelcomeModal />
                            {children}
                        </CartProvider>
                    </UserProvider>
                    </PlayerProvider>
                </GlobalProvider>
            </body>
        </html>
    );
}

