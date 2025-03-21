import React, { useState } from 'react';
import Image from 'next/image';

interface SafeImageProps {
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
    priority?: boolean;
}

const SafeImage: React.FC<SafeImageProps> = ({ 
    src, 
    alt, 
    width, 
    height, 
    className,
    priority = false 
}) => {
    const [error, setError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const handleError = () => {
        console.error(`Ошибка загрузки изображения: ${src}`);
        setError(true);
        setIsLoading(false);
    };

    const handleLoad = () => {
        setIsLoading(false);
    };

    // Создаем URL для изображения-заглушки
    const blurDataURL = `data:image/svg+xml;base64,${Buffer.from(
        `<svg width="${width}" height="${height}" version="1.1" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" fill="#F3F4F6"/></svg>`
    ).toString('base64')}`;

    if (error) {
        return (
            <div 
                className={`bg-gray-200 flex items-center justify-center ${className}`}
                style={{ width, height }}
            >
                <span className="text-gray-400">Изображение недоступно</span>
            </div>
        );
    }

    return (
        <div className="relative">
            <Image
                src={src}
                alt={alt}
                width={width}
                height={height}
                className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
                onError={handleError}
                onLoad={handleLoad}
                loading={priority ? 'eager' : 'lazy'}
                priority={priority}
                placeholder="blur"
                blurDataURL={blurDataURL}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                quality={75}
            />
            {isLoading && (
                <div 
                    className="absolute inset-0 bg-gray-200 animate-pulse"
                    style={{ width, height }}
                />
            )}
        </div>
    );
};

export default SafeImage; 