"use client";

import React from 'react';
import ClientOnly from './ClientOnly';
import TutorialGuide, { TutorialStep } from './TutorialGuide';

interface ClientTutorialGuideProps {
    steps: TutorialStep[];
    isFirstVisit?: boolean;
    onComplete?: () => void;
}

const ClientTutorialGuide: React.FC<ClientTutorialGuideProps> = (props) => {
    return (
        <ClientOnly>
            <TutorialGuide {...props} />
        </ClientOnly>
    );
};

export default ClientTutorialGuide; 