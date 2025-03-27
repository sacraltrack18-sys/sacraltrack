import { ReactNode } from 'react';
import OnboardingGuide from '@/app/components/onboarding/OnboardingGuide';

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0F1424]">
      {children}
      <OnboardingGuide />
    </div>
  );
} 