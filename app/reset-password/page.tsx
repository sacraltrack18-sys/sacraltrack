'use client';

import { Suspense } from 'react';
import ResetPasswordForm from '@/app/components/auth/ResetPasswordForm';

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="fixed inset-0 bg-[#1E1F2E] flex items-center justify-center p-4">Loading...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
} 