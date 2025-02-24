import React, { useState, useEffect, useContext } from 'react';
import { useUser } from "@/app/context/user";
import { useRouter } from "next/navigation";
import { AiOutlinePlus, AiOutlineHeart } from 'react-icons/ai';
import useDownloadsStore from '@/app/stores/downloadsStore';




interface ProfileComponentsProps {
  showPaidPosts: boolean;
  toggleShowPaidPosts: () => void;
}

const ProfileComponents = () => {
  const userContext = useUser();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [showLiked, setShowLiked] = useState(false);
  const { showPaidPosts, toggleShowPaidPosts } = useDownloadsStore();



  const goTo = () => {
    if (!userContext?.user) 
      setIsLoginOpen(true);
    else
      router.push('/upload');
  };

  const goToPeople = () => {
    if (!userContext?.user) 
      setIsLoginOpen(true);
    else
      router.push("/people");
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleLiked = () => {
    setShowLiked(!showLiked);
  };

    return (
    <div className="flex items-center gap-6">
      {/* Кнопка Purchased */}
                   <button
            onClick={toggleShowPaidPosts}
        className={`flex items-center transition-colors duration-300 group ${
          showPaidPosts ? 'text-[#20DDBB]' : 'text-gray-400 hover:text-white'
        }`}
      >
        <img 
          src="/images/downloads.svg" 
          alt="purchased" 
          className={`w-5 h-5 mr-2 transition-transform duration-300 ${
            showPaidPosts ? 'scale-110' : 'group-hover:scale-110'
          }`}
        />
        <span className="text-[14px] font-medium">Purchased</span>
                    </button>

      {/* Кнопка I Like */}
                <button
        onClick={toggleLiked}
        className={`flex items-center transition-colors duration-300 group ${
          showLiked ? 'text-[#20DDBB]' : 'text-gray-400 hover:text-white'
        }`}
      >
        <AiOutlineHeart 
          className={`w-5 h-5 mr-2 transition-transform duration-300 ${
            showLiked ? 'scale-110' : 'group-hover:scale-110'
          }`}
        />
        <span className="text-[14px] font-medium">I Like</span>
                    </button>
        </div>
    );
}

export default ProfileComponents;
