"use client";

// components/Background.tsx

import React, { useEffect } from 'react';
import '@/app/globals.css'; 

const Background: React.FC = () => {
    useEffect(() => {
        const interBubble = document.querySelector('.interactive') as HTMLElement;
        let curX = 0;
        let curY = 0;
        let tgX = 0;
        let tgY = 0;

        const move = () => {
            if (interBubble) {
                const bubbleRect = interBubble.getBoundingClientRect();
                curX += (tgX - bubbleRect.width / 2 - curX) / 20;
                curY += (tgY - bubbleRect.height / 2 - curY) / 20;

                interBubble.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
            }
            requestAnimationFrame(move);
        };

        const handleMouseMove = (event: MouseEvent) => {
            tgX = event.clientX;
            tgY = event.clientY;
        };

        window.addEventListener('mousemove', handleMouseMove);
        move();

        const dynamicBubbles = document.querySelectorAll('.dynamic-bubble') as NodeListOf<HTMLElement>;
        dynamicBubbles.forEach((bubble) => {
            const speedX = 0.5 + Math.random() * 1.5; // рандомная скорость по X
            const speedY = 0.5 + Math.random() * 1.5; // рандомная скорость по Y
            let dirX = Math.random() < 0.5 ? -1 : 1; // случайное направление по X
            let dirY = Math.random() < 0.5 ? -1 : 1; // случайное направление по Y
            let posX = Math.random() * window.innerWidth; // случайное начальное положение по X
            let posY = Math.random() * window.innerHeight; // случайное начальное положение по Y

            const updateBubble = () => {
                posX += speedX * dirX;
                posY += speedY * dirY;

                // Проверка на пределы экрана, чтобы изменить направление
                if (posX <= 0 || posX >= window.innerWidth) dirX *= -1;
                if (posY <= 0 || posY >= window.innerHeight) dirY *= -1;

                bubble.style.transform = `translate(${posX}px, ${posY}px)`;
                requestAnimationFrame(updateBubble);
            };
            updateBubble();
        });

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <div className="gradient-bg">
            <div className="gradients-container">
                <div className="g1"></div>
                <div className="g2"></div>
                <div className="g3"></div>
                <div className="g4"></div>
                <div className="g5"></div>
                <div className="interactive"></div>
                <div className="dynamic-bubble pink"></div>
                <div className="dynamic-bubble purple"></div>
            </div>
        </div>
    );
};

export default Background;
