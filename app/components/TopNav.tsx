import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
    id: string;
    name: string;
    image?: string;
}

interface TopNavProps {
    user?: User | null;
}

const TopNav = ({ user }: TopNavProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const handleLogout = () => {
        // Здесь добавьте логику выхода
        setIsOpen(false);
        router.push('/login');
    };

    return (
        <>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#2A184B] rounded-xl shadow-lg py-1 z-50">
                    {user ? (
                        <>
                            <div className="px-4 py-2 text-sm text-gray-400 border-b border-gray-700 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden">
                                    {user.image ? (
                                        <img 
                                            src={user.image} 
                                            alt={user.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                                            <span className="text-gray-300 text-sm">
                                                {user.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {user.name}
                            </div>
                            <Link
                                href={`/profile/${user.id}`}
                                className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#1f1239] transition-colors"
                            >
                                View profile
                            </Link>
                            <Link
                                href="/people"
                                className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#1f1239] transition-colors"
                            >
                                People
                            </Link>
                            <Link
                                href="/royalty"
                                className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#1f1239] transition-colors"
                            >
                                Royalty
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#1f1239] transition-colors"
                            >
                                Sign out
                            </button>
                        </>
                    ) : (
                        <Link
                            href="/login"
                            className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#1f1239] transition-colors"
                        >
                            Sign in
                        </Link>
                    )}
                </div>
            )}
        </>
    );
};

export default TopNav; 