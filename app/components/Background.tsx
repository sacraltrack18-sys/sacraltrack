"use client";

// components/Background.tsx

import React, { useEffect } from 'react';
import '@/app/globals.css'; 

const Background: React.FC = () => {
    // Временно отключены анимации плавающих пузырьков
    // для улучшения производительности

    return (
        <div className="gradient-bg">
            <div className="gradients-container">
                <div className="g1"></div>
                <div className="g2"></div>
                <div className="g3"></div>
                <div className="g4"></div>
                <div className="g5"></div>
                {/* Временно скрыты анимированные элементы */}
                {/* <div className="interactive"></div> */}
                {/* <div className="dynamic-bubble pink"></div> */}
                {/* <div className="dynamic-bubble purple"></div> */}
            </div>
        </div>
    );
};

export default Background;
