"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useCreateBucketUrl from "@/app/hooks/useCreateBucketUrl";
import { FaEdit } from 'react-icons/fa';
import { BsLink45Deg, BsGlobe } from 'react-icons/bs';
import { IoMdMusicalNotes } from 'react-icons/io';
import { useUser } from "@/app/context/user";
import { useGeneralStore } from "@/app/stores/general";
import { FaTwitter, FaInstagram, FaSoundcloud, FaYoutube, FaTelegram } from 'react-icons/fa';
import { format } from 'date-fns';
import { MdVerified, MdOutlineWorkOutline } from 'react-icons/md';
import Image from 'next/image';
import Link from 'next/link';
import { BsInstagram, BsTwitterX, BsSpotify, BsPeople } from 'react-icons/bs';
import { CiLocationOn } from 'react-icons/ci';
import { ProfileType } from '@/app/types';
import { useFriendsStore } from '@/app/stores/friends';
import { usePostStore } from '@/app/stores/post';
import { useLikedStore } from '@/app/stores/likedStore';
import { Profile } from '@/app/types';

interface SocialLinks {
  twitter?: string;
  instagram?: string;
  soundcloud?: string;
  youtube?: string;
  telegram?: string;
}

interface UserProfileSidebarProps {
  profile: ProfileType | {
    $id: string;
    user_id: string;
    name: string;
    image: string;
    bio: string;
    stats?: any;
    created_at?: string;
    [key: string]: any;
  };
}

const UserProfileSidebar: React.FC<UserProfileSidebarProps> = ({ profile }) => {
  // Helper function to safely get profile properties
  const getProfileProperty = <T,>(key: string, defaultValue: T): T => {
    // Special case for id
    if (key === 'id' && (profile as any)['$id'] !== undefined) {
      return (profile as any)['$id'] as T;
    }
    
    // Handle nested properties
    if (key.includes('.')) {
      const parts = key.split('.');
      let obj = profile as any;
      for (const part of parts) {
        if (obj === undefined || obj === null) return defaultValue;
        obj = obj[part];
      }
      return obj !== undefined ? obj : defaultValue;
    }
    
    return (profile as any)[key] !== undefined ? (profile as any)[key] : defaultValue;
  };

  // Get profile ID safely
  const profileId = getProfileProperty('id', '') || getProfileProperty('$id', '');
  const userId = getProfileProperty('user_id', '');
  const name = getProfileProperty('name', 'User');
  const imageUrl = getProfileProperty('image', '') || getProfileProperty('image_url', '');
  const bio = getProfileProperty('bio', '');
  const hasStats = !!(getProfileProperty('stats', null) || getProfileProperty('$stats', null));

  // Закомментируем избыточный вывод в консоль
  // console.log('UserProfileSidebar received profile:', 
  //   profile ? JSON.stringify({
  //     id: profileId,
  //     user_id: userId,
  //     name,
  //     image: imageUrl,
  //     bio,
  //     hasStats
  //   }, null, 2) : 'null'
  // );

  const contextUser = useUser();
  const { setIsEditProfileOpen } = useGeneralStore();
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [expandSocial, setExpandSocial] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { friends, loadFriends } = useFriendsStore();
  const { postsByUser } = usePostStore();
  const { likedPosts } = useLikedStore();
  const [rank, setRank] = useState({ name: 'Beginner', color: 'from-gray-400 to-gray-500', score: 0 });
  
  // Track when profile data changes for re-rendering
  const [profileVersion, setProfileVersion] = useState(0);
  
  // Update profileVersion when profile changes
  useEffect(() => {
    setProfileVersion(prev => prev + 1);
  }, [profile]);
  
  // Check if the current user is the profile owner
  const isOwner = contextUser?.user?.id === userId;
  
  // Get profile image URL
  const profileImageUrl = imageUrl 
    ? useCreateBucketUrl(imageUrl)
    : '/images/placeholders/user-placeholder.svg';

  // Handler to open profile editor
  const handleOpenProfileEditor = () => {
    if (isOwner) {
      setIsEditProfileOpen(true);
    }
  };
  
  // Format joined date if available
  const formattedJoinedDate = getProfileProperty('joined_date', null) 
    ? format(new Date(getProfileProperty('joined_date', '')), 'MMMM yyyy')
    : null;

  // Social links rendering
  const renderSocialLinks = () => {
    if (!getProfileProperty('social_links', null)) return null;
    
    const socialIcons = [
      { key: 'twitter', Icon: FaTwitter, link: getProfileProperty('social_links.twitter', ''), color: '#1DA1F2' },
      { key: 'instagram', Icon: FaInstagram, link: getProfileProperty('social_links.instagram', ''), color: '#E1306C' },
      { key: 'soundcloud', Icon: FaSoundcloud, link: getProfileProperty('social_links.soundcloud', ''), color: '#FF5500' },
      { key: 'youtube', Icon: FaYoutube, link: getProfileProperty('social_links.youtube', ''), color: '#FF0000' },
      { key: 'telegram', Icon: FaTelegram, link: getProfileProperty('social_links.telegram', ''), color: '#0088CC' },
    ].filter(item => item.link);
    
    if (socialIcons.length === 0) return null;
    
    return (
      <motion.div 
        className="mt-3 border-t border-white/10 pt-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div 
          className="flex items-center gap-2 mb-2 justify-between"
          onClick={isOwner ? handleOpenProfileEditor : undefined}
        >
          <span className="text-[#A6B1D0] text-sm font-medium">Social Profiles</span>
          {isOwner && (
            <motion.span
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="text-[#20DDBB] cursor-pointer"
            >
              <FaEdit size={12} />
            </motion.span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {socialIcons.map(({ key, Icon, link, color }) => (
            <motion.a
              key={key}
              href={link?.startsWith('http') ? link : `https://${link}`}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all duration-300"
              style={{ boxShadow: `0 0 10px ${color}20` }}
            >
              <Icon className="text-[#20DDBB]" />
            </motion.a>
          ))}
        </div>
      </motion.div>
    );
  };

  // Stats section
  const renderStats = () => {
    if (!getProfileProperty('followers_count', null) && !getProfileProperty('tracks_count', null)) return null;
    
    return (
      <motion.div 
        className="flex gap-4 mt-4 pt-3 border-t border-white/10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        {getProfileProperty('followers_count', null) !== undefined && (
          <div className="text-center">
            <span className="block text-white font-bold">{getProfileProperty('followers_count', null)}</span>
            <span className="text-xs text-[#A6B1D0]">Followers</span>
          </div>
        )}
        {getProfileProperty('tracks_count', null) !== undefined && (
          <div className="text-center">
            <span className="block text-white font-bold">{getProfileProperty('tracks_count', null)}</span>
            <span className="text-xs text-[#A6B1D0]">Tracks</span>
          </div>
        )}
      </motion.div>
    );
  };

  // Rating calculation
  useEffect(() => {
    // Simple rating calculation based on number of friends, tracks and likes
    const friendsScore = friends.length * 10;
    const tracksScore = postsByUser?.length * 15 || 0;
    const likesScore = likedPosts?.length * 5 || 0;
    
    const totalScore = friendsScore + tracksScore + likesScore;
    
    // Determining rank based on total score
    let rankName = 'Beginner';
    let color = 'from-gray-400 to-gray-500';
    
    if (totalScore >= 500) {
      rankName = 'Legend';
      color = 'from-purple-400 to-pink-500';
    } else if (totalScore >= 300) {
      rankName = 'Master';
      color = 'from-blue-400 to-purple-500';
    } else if (totalScore >= 150) {
      rankName = 'Advanced';
      color = 'from-cyan-400 to-blue-500';
    } else if (totalScore >= 50) {
      rankName = 'Experienced';
      color = 'from-green-400 to-teal-500';
    }
    
    setRank({ name: rankName, color, score: totalScore });
  }, [friends.length, postsByUser, likedPosts]);
  
  // Load friends for rating calculation
  useEffect(() => {
    if (userId) {
      loadFriends();
    }
  }, [userId, loadFriends]);

  // Get stats from profile
  const getStats = () => {
    const stats = getProfileProperty('stats', {}) as any;
    
    return {
      followers: (stats?.totalFollowers || stats?.followers || getProfileProperty('followers_count', 0)) as number,
      tracks: (stats?.totalTracks || stats?.tracks || getProfileProperty('tracks_count', 0)) as number,
      likes: (stats?.totalLikes || stats?.likes || getProfileProperty('likes_count', 0)) as number
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-[90px] w-full max-w-[350px] rounded-2xl overflow-hidden z-10"
    >
      <div className="glass-profile-card bg-gradient-to-br from-[#24183D]/70 to-[#1A1E36]/80 backdrop-blur-xl border border-white/10 shadow-[0_0_25px_rgba(32,221,187,0.15)] rounded-2xl overflow-hidden">
        {/* Profile Image Section - Clickable for owners */}
        <div 
          className={`relative w-full aspect-square overflow-hidden group ${isOwner ? 'cursor-pointer' : ''}`}
          onClick={isOwner ? handleOpenProfileEditor : undefined}
        >
          {/* Adding rating directly on the profile image */}
          <motion.div 
            className="absolute top-3 left-3 z-20 glass-rating px-2 py-1 rounded-full flex items-center gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div 
              className={`h-5 w-5 rounded-full flex items-center justify-center bg-gradient-to-r ${rank.color} text-xs font-bold`}
              animate={{ 
                scale: [1, 1.1, 1],
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                repeatType: "reverse"
              }}
            >
              {rank.score}
            </motion.div>
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${rank.color} text-xs font-bold`}>
              {rank.name}
            </span>
          </motion.div>

          <motion.div
            className="absolute inset-0 bg-gradient-to-b from-[#20DDBB]/0 to-[#20DDBB]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
            whileHover={{ opacity: 1 }}
          />
          
          <motion.img
            src={imageError ? "/images/placeholders/user-placeholder.svg" : profileImageUrl}
            alt={name || 'Profile'}
            className="w-full h-full object-cover transition-transform duration-500"
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onError={() => setImageError(true)}
          />
          
          {isOwner && (
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 z-20"
                >
                  <div className="text-white text-center px-4 py-2 rounded-lg bg-[#20DDBB]/20 backdrop-blur-sm">
                    <FaEdit size={18} className="inline mr-2" />
                    <span>Edit Photo</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
        
        {/* Profile Info Section - Clickable texts for owners */}
        <div className="p-6">
          <div 
            className={`relative group ${isOwner ? 'cursor-pointer hover:text-[#20DDBB] transition-colors' : ''}`}
            onClick={isOwner ? handleOpenProfileEditor : undefined}
            onMouseEnter={() => setHoveredElement('name')}
            onMouseLeave={() => setHoveredElement(null)}
          >
            <motion.h2 
              className="text-2xl font-bold text-white mb-2 flex items-center gap-2"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {name && name.toString() !== "Artist Name" ? (
                <>
                  <span>{name}</span>
                  {getProfileProperty('verified', false) && (
                    <motion.span 
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="text-[#20DDBB]"
                    >
                      <MdVerified size={18} />
                    </motion.span>
                  )}
                </>
              ) : isOwner ? (
                <span className="italic text-white/70 hover:text-[#20DDBB] transition-colors">
                  Enter your name
                </span>
              ) : (
                'Artist Name'
              )}
              {isOwner && hoveredElement === 'name' && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="inline-block ml-2"
                >
                  <FaEdit size={14} className="text-[#20DDBB] opacity-80" />
                </motion.span>
              )}
            </motion.h2>
          </div>
          
          {/* Role - if available */}
          {getProfileProperty('role', null) && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={`flex items-center gap-2 text-sm text-[#20DDBB]/80 mb-3 ${isOwner ? 'cursor-pointer hover:text-[#20DDBB] transition-colors' : ''}`}
              onClick={isOwner ? handleOpenProfileEditor : undefined}
              onMouseEnter={() => setHoveredElement('role')}
              onMouseLeave={() => setHoveredElement(null)}
            >
              <MdOutlineWorkOutline className="text-[#20DDBB]" />
              <span>{getProfileProperty('role', '')}</span>
              {isOwner && hoveredElement === 'role' && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <FaEdit size={12} className="text-[#20DDBB] opacity-80" />
                </motion.span>
              )}
            </motion.div>
          )}
          
          {/* Genre - always displayed */}
          <div 
            className={`flex items-center gap-2 group ${isOwner ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            onClick={isOwner ? handleOpenProfileEditor : undefined}
            onMouseEnter={() => setHoveredElement('genre')}
            onMouseLeave={() => setHoveredElement(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 text-sm text-[#20DDBB] mb-4"
            >
              <IoMdMusicalNotes />
              {getProfileProperty('genre', null) ? (
                <span>{getProfileProperty('genre', '')}</span>
              ) : isOwner ? (
                <span className="italic text-[#20DDBB]/50 hover:text-[#20DDBB]/70 transition-colors">
                  Specify your music genre
                </span>
              ) : null}
              {isOwner && hoveredElement === 'genre' && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <FaEdit size={12} className="text-[#20DDBB] opacity-80" />
                </motion.span>
              )}
            </motion.div>
          </div>
          
          {/* Joined date - if available */}
          {formattedJoinedDate && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-xs text-[#A6B1D0]/70 mb-4"
            >
              Joined {formattedJoinedDate}
            </motion.div>
          )}
          
          {/* Biography - always displayed */}
          <div 
            className={`group ${isOwner ? 'cursor-pointer hover:text-white transition-colors' : ''}`}
            onClick={isOwner ? handleOpenProfileEditor : undefined}
            onMouseEnter={() => setHoveredElement('bio')}
            onMouseLeave={() => setHoveredElement(null)}
          >
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-[#A6B1D0] mb-6 text-sm relative"
            >
              {bio ? (
                bio
              ) : isOwner ? (
                <span className="italic text-[#A6B1D0]/50 hover:text-[#20DDBB]/70 transition-colors">
                  Share your thoughts or tell about yourself...
                </span>
              ) : (
                <span className="italic text-[#A6B1D0]/50">
                  User has not added any information yet
                </span>
              )}
              {isOwner && hoveredElement === 'bio' && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="inline-block ml-2"
                >
                  <FaEdit size={12} className="text-[#20DDBB] opacity-80" />
                </motion.span>
              )}
            </motion.p>
          </div>
          
          <div className="space-y-3">
            {/* Location - always displayed for owner */}
            <div 
              className={`group ${isOwner ? 'cursor-pointer hover:text-white transition-colors' : ''} ${!getProfileProperty('location', null) && !isOwner ? 'hidden' : ''}`}
              onClick={isOwner ? handleOpenProfileEditor : undefined}
              onMouseEnter={() => setHoveredElement('location')}
              onMouseLeave={() => setHoveredElement(null)}
            >
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-3 text-sm text-[#A6B1D0]"
              >
                <BsGlobe className="text-[#20DDBB]" />
                {getProfileProperty('location', null) ? (
                  <span>{getProfileProperty('location', '')}</span>
                ) : isOwner ? (
                  <span className="italic text-[#A6B1D0]/50 hover:text-white/70 transition-colors">
                    Add your location
                  </span>
                ) : null}
                {isOwner && hoveredElement === 'location' && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <FaEdit size={12} className="text-[#20DDBB] opacity-80" />
                  </motion.span>
                )}
              </motion.div>
            </div>
            
            {/* Website - always displayed for owner */}
            <div
              className={`group ${isOwner ? 'cursor-pointer hover:text-white transition-colors' : ''} ${!getProfileProperty('website', null) && !isOwner ? 'hidden' : ''}`}
              onClick={isOwner ? handleOpenProfileEditor : undefined}
              onMouseEnter={() => setHoveredElement('website')}
              onMouseLeave={() => setHoveredElement(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-3 text-sm text-[#A6B1D0]"
              >
                <BsLink45Deg className="text-[#20DDBB]" />
                {getProfileProperty('website', null) ? (
                  isOwner ? (
                    <span className="truncate">{getProfileProperty('website', '')}</span>
                  ) : (
                    <a 
                      href={getProfileProperty('website', '').startsWith('http') ? getProfileProperty('website', '') : `https://${getProfileProperty('website', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate hover:text-[#20DDBB] transition-colors"
                    >
                      {getProfileProperty('website', '')}
                    </a>
                  )
                ) : isOwner ? (
                  <span className="italic text-[#A6B1D0]/50 hover:text-white/70 transition-colors">
                    Add a link to your website
                  </span>
                ) : null}
                {isOwner && hoveredElement === 'website' && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <FaEdit size={12} className="text-[#20DDBB] opacity-80" />
                  </motion.span>
                )}
              </motion.div>
            </div>
          </div>

          {/* Social links section */}
          {renderSocialLinks()}
          
          {/* User stats */}
          {renderStats()}
        </div>
      </div>
      
      {/* Custom CSS for glass effect */}
      <style jsx global>{`
        .glass-profile-card {
          position: relative;
          z-index: 1;
        }
        
        .glass-profile-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: -1;
          background: radial-gradient(circle at top right, rgba(32,221,187,0.1), transparent 70%);
          pointer-events: none;
        }
        
        .glass-rating {
          background: rgba(26, 30, 54, 0.7);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 0 10px rgba(32, 221, 187, 0.2);
        }
      `}</style>
    </motion.div>
  );
};

export default UserProfileSidebar; 