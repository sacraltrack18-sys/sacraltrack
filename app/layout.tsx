"use client";

import UserProvider from './context/user';
import AllOverlays from "@/app/components/AllOverlays";
import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { GlobalProvider } from './globalProvider';
import { CartProvider } from './context/CartContext';
import Head from 'next/head';
import { Suspense } from 'react';
import YandexMetrika from '@/libs/YandexMetrika';
import Background from '@/app/components/Background'; 
import { PlayerProvider } from '@/app/context/playerContext'; 
import GlobalLoader from './components/GlobalLoader'


const metadata: Metadata = {
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
            <Head>
                <meta property="og:title" content={String(metadata.openGraph?.title) ?? ''} />
                <meta property="og:description" content={metadata.openGraph?.description} />
                <meta property="og:url" content={metadata.openGraph?.url ? String(metadata.openGraph.url) : ''} />
                <meta property="og:type" content={(metadata.openGraph as any)?.type ?? ''} />
                <meta property="og:image" content={metadata.openGraph?.images ? Array.isArray(metadata.openGraph.images) ? metadata.openGraph.images.map((image: any) => image?.url ?? '').join(',') : (metadata.openGraph.images as any)?.url ?? '' : ''} />
                <script 
                    async 
                    src="https://mc.yandex.ru/watch/98093904"
                    type="text/javascript"
                />
            </Head>
            <body className="bg-[linear-gradient(60deg,#2E2469,#351E43)] text-white">
                <GlobalLoader />
                <Suspense fallback={<></>}>
                    <YandexMetrika />
                </Suspense>
                <Background /> {/* Добавляем фон */}
                <GlobalProvider>
                <PlayerProvider>
                    <UserProvider>
                        <CartProvider>
                       
                            <Toaster position='bottom-center' />
                            <AllOverlays />
                            {children}
                        
                        </CartProvider>
                    </UserProvider>
                    </PlayerProvider>
                </GlobalProvider>
            </body>
        </html>
    );
}
