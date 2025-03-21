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

