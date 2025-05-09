"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cropper } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';
import { toast } from 'react-hot-toast';
import { useGeneralStore } from "@/app/stores/general";
import { useProfileStore } from "@/app/stores/profile";
import { useUser } from '@/app/context/user';
import { useRouter } from 'next/navigation';
import createBucketUrl from "@/app/hooks/useCreateBucketUrl";
import useChangeUserImage from '@/app/hooks/useChangeUserImage';
import useUpdateProfile from '@/app/hooks/useUpdateProfile';
import useUpdateProfileImage from '@/app/hooks/useUpdateProfileImage';
import { SocialLinks, Profile, UserContextTypes } from '@/app/types';
import useGeolocation from '@/app/hooks/useGeolocation';

// Icons
import { FaTwitter, FaInstagram, FaSoundcloud, FaYoutube, FaTelegram } from 'react-icons/fa';
import { BsCheck, BsLink45Deg, BsImage, BsX, BsVinylFill, BsTag } from 'react-icons/bs';
import { IoMdMusicalNotes } from 'react-icons/io';
import { MdLocationOn, MdOutlineWorkOutline, MdVerified, MdClose } from 'react-icons/md';
import { IoCheckmarkCircle, IoImageOutline } from 'react-icons/io5';
import { HiOutlineSparkles } from 'react-icons/hi';
import { FaMicrophone, FaHeadphones } from 'react-icons/fa';

// Animation variants
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    transition: { type: "spring", damping: 25, stiffness: 300 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 20, 
    transition: { duration: 0.2 } 
  }
};

const tabVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};

// Success toast component
const SuccessToast = ({ message }: { message: string }) => (
  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#1A2338]/90 to-[#24183D]/90 backdrop-blur-md rounded-xl border border-green-500/30 shadow-lg">
    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
      <IoCheckmarkCircle className="text-green-400" size={20} />
    </div>
    <p className="text-white font-medium">{message}</p>
  </div>
);

// Initial social links state
const initialSocialLinks = {
  twitter: '',
  instagram: '',
  soundcloud: '',
  youtube: '',
  telegram: ''
};

// Social icons map
const socialIcons = {
  twitter: { icon: FaTwitter, color: '#1DA1F2' },
  instagram: { icon: FaInstagram, color: '#E1306C' },
  soundcloud: { icon: FaSoundcloud, color: '#FF5500' },
  youtube: { icon: FaYoutube, color: '#FF0000' },
  telegram: { icon: FaTelegram, color: '#0088CC' }
};

const roleOptions = [
  { id: 'artist', label: 'Artist' },
  { id: 'producer', label: 'Producer' },
  { id: 'dj', label: 'DJ' },
  { id: 'vocalist', label: 'Vocalist' },
  { id: 'listener', label: 'Listener' },
  { id: 'label', label: 'Label' }
];

// Расширенный тип профиля для внутреннего использования
interface EnhancedProfile {
  $id: string;
  user_id: string;
  name: string;
  image: string;
  bio: string;
  location?: string;
  website?: string;
  role?: string;
  verified?: boolean;
  social_links?: SocialLinks;
  updated_at?: string;
  stats?: {
    totalLikes: number;
    totalFollowers: number;
    averageRating: number;
    totalRatings: number;
  };
}

const EnhancedEditProfileOverlay: React.FC = () => {
  const router = useRouter();
  const contextUser = useUser() as UserContextTypes | null;
  const { currentProfile, setCurrentProfile } = useProfileStore() as unknown as { 
    currentProfile: EnhancedProfile | null; 
    setCurrentProfile: (profileOrId: EnhancedProfile | string) => void 
  };
  const { isEditProfileOpen, setIsEditProfileOpen } = useGeneralStore();
  const { getCurrentLocation, locationName, isLoading: isLoadingLocation } = useGeolocation();
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  
  // Form state
  const [activeTab, setActiveTab] = useState('basic');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [role, setRole] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(initialSocialLinks);
  
  // Image handling
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [cropper, setCropper] = useState<any>(null);
  const [imageUploaded, setImageUploaded] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [formTouched, setFormTouched] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize form state from profile data
  useEffect(() => {
    if (currentProfile) {
      setName(currentProfile.name || '');
      setBio(currentProfile.bio || '');
      setLocation(currentProfile.location || '');
      setWebsite(currentProfile.website || '');
      setRole(currentProfile.role || '');
      
      if (currentProfile.social_links) {
        try {
          // Пытаемся разобрать JSON-строку
          const parsedLinks = typeof currentProfile.social_links === 'string' 
            ? JSON.parse(currentProfile.social_links) 
            : currentProfile.social_links;
          
          setSocialLinks({
            twitter: parsedLinks.twitter || '',
            instagram: parsedLinks.instagram || '',
            soundcloud: parsedLinks.soundcloud || '',
            youtube: parsedLinks.youtube || '',
            telegram: parsedLinks.telegram || ''
          });
        } catch (error) {
          console.error('Failed to parse social links:', error);
          setSocialLinks(initialSocialLinks);
        }
      } else {
        setSocialLinks(initialSocialLinks);
      }
    }
  }, [currentProfile]);
  
  // Add an effect to refetch profile when user changes
  useEffect(() => {
    // Check if contextUser is not null and has a user object with an id
    if (contextUser?.user?.id) {
      // If user ID is available and currentProfile is missing or doesn't match the user ID
      if (!currentProfile || currentProfile.user_id !== contextUser.user.id) {
        console.log('User changed, refreshing profile data...');
        setCurrentProfile(contextUser.user.id);
      }
    }
  }, [contextUser?.user, currentProfile, setCurrentProfile]);
  
  // Simulate upload progress
  useEffect(() => {
    if (uploadingImage && uploadProgress < 95) {
      const interval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 5, 95));
      }, 150);
      return () => clearInterval(interval);
    }
  }, [uploadingImage, uploadProgress]);
  
  // Reset form state when modal closes
  useEffect(() => {
    if (!isEditProfileOpen) {
      setFormTouched(false);
      setError('');
      setUploadProgress(0);
      setUploadingImage(false);
    }
  }, [isEditProfileOpen]);
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFormTouched(true);
      
      const imageUrl = URL.createObjectURL(selectedFile);
      setImagePreview(imageUrl);
    }
  };
  
  // Handle cropping image
  const handleCrop = async () => {
    if (cropper && file) {
      const canvas = cropper.getCanvas();
      if (canvas) {
        try {
          setIsSavingImage(true);
          
          canvas.toBlob(async (blob: Blob) => {
            if (blob) {
              const croppedFile = new File([blob], file.name, { type: file.type });
              setFile(croppedFile);
              setImagePreview(URL.createObjectURL(croppedFile));
              
              // Immediately save the image if we have a profile
              if (currentProfile?.$id) {
                try {
                  // Start uploading animation
                  setUploadProgress(0);
                  const uploadProgressInterval = setInterval(() => {
                    setUploadProgress(prev => Math.min(prev + 5, 95));
                  }, 100);
                  
                  const dimensions = { left: 0, top: 0, width: 0, height: 0 };
                  const newImageId = await useChangeUserImage(croppedFile, dimensions, currentProfile.image || '');
                  
                  // Upload complete - set to 100%
                  setUploadProgress(100);
                  clearInterval(uploadProgressInterval);
                  
                  // Update the profile with the new image
                  await useUpdateProfileImage(currentProfile.$id, newImageId);
                  
                  // Refetch the current profile to get the updated data
                  await setCurrentProfile(currentProfile.$id);
                  
                  // Mark as uploaded and show success
                  setImageUploaded(true);
                  
                  toast.custom(() => (
                    <SuccessToast message="Profile image updated successfully" />
                  ), { duration: 3000 });
                } catch (error) {
                  console.error('Error saving image:', error);
                  toast.error('Failed to save profile image');
                }
              } else {
                // Just mark as uploaded if we don't have a profile yet
                setImageUploaded(true);
                toast.custom(() => (
                  <SuccessToast message="Image cropped successfully" />
                ), { duration: 3000 });
              }
            }
            setIsSavingImage(false);
          });
        } catch (error) {
          console.error('Error processing image:', error);
          toast.error('Failed to process image');
          setIsSavingImage(false);
        }
      }
    }
  };
  
  // Handle social link change
  const handleSocialLinkChange = (platform: keyof SocialLinks, value: string) => {
    setSocialLinks(prev => ({ ...prev, [platform]: value }));
    setFormTouched(true);
  };
  
  // Reset image state
  const resetImageState = () => {
    setImagePreview('');
    setFile(null);
    setImageUploaded(false);
    setUploadProgress(0);
  };
  
  // Обработчик автоматического определения локации
  const handleDetectLocation = async () => {
    try {
      setIsDetectingLocation(true);
      const detectedLocation = await getCurrentLocation(true);
      if (detectedLocation) {
        setLocation(detectedLocation);
        toast.success('Your location has been detected!');
      } else {
        toast.error('Could not detect your location');
      }
    } catch (error) {
      console.warn('Error detecting location:', error);
      toast.error('Could not detect your location');
    } finally {
      setIsDetectingLocation(false);
    }
  };
  
  // Ask for location on first load if not set
  useEffect(() => {
    if (isEditProfileOpen && currentProfile && !currentProfile.location && !location) {
      // Ask for permission to detect location
      const askForLocation = async () => {
        const confirmed = window.confirm('Would you like to add your current location to your profile?');
        if (confirmed) {
          await handleDetectLocation();
        }
      };
      
      // Add a small delay before asking
      const timer = setTimeout(() => {
        askForLocation();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isEditProfileOpen, currentProfile, location]);
  
  // Handle form submission
  const handleSave = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      if (!name.trim()) {
        setError('Please provide a username');
        setIsLoading(false);
        return;
      }
      
      // Корректная обработка социальных ссылок
      let validatedSocialLinks: Record<string, string> | undefined = undefined;
      
      // Проверяем и валидируем социальные ссылки
      if (Object.values(socialLinks).some(link => link && link.trim())) {
        validatedSocialLinks = {};
        
        // Проходим по всем ссылкам и валидируем их
        Object.entries(socialLinks).forEach(([platform, url]) => {
          if (url && url.trim()) {
            // Ограничиваем длину ссылки до 300 символов
            const trimmedUrl = url.trim().substring(0, 300);
            validatedSocialLinks![platform] = trimmedUrl;
          }
        });
      }
      
      // Проверяем, пуст ли объект социальных ссылок
      const hasSocialLinks = validatedSocialLinks && Object.keys(validatedSocialLinks).length > 0;
      
      // Преобразуем объект social_links в строку JSON
      const socialLinksString = hasSocialLinks ? JSON.stringify(validatedSocialLinks) : undefined;
      
      // Проверяем, что длина строки не превышает 300 символов
      const finalSocialLinks = socialLinksString && socialLinksString.length > 300 
        ? JSON.stringify({ note: "Too many social links to save" }) 
        : socialLinksString;
      
      // Prepare profile data
      const profileData = {
        id: currentProfile?.$id || '',
        user_id: currentProfile?.user_id || contextUser?.user?.id || '',
        name: name.trim(),
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        role: role.trim(),
        social_links: finalSocialLinks,
        updated_at: new Date().toISOString()
      };
      
      // Update profile
      if (currentProfile?.$id) {
        await useUpdateProfile(profileData);
        
        // Update profile image if changed but not already uploaded
        if (file && !imageUploaded) {
          setUploadingImage(true);
          
          const dimensions = { left: 0, top: 0, width: 0, height: 0 };
          const newImageId = await useChangeUserImage(file, dimensions, currentProfile.image || '');
          
          await useUpdateProfileImage(currentProfile.$id, newImageId);
          
          // Reset image state after successful upload
          resetImageState();
        }
        
        // Refetch the current profile to get the updated data
        await setCurrentProfile(currentProfile.$id);
        
        // Show success toast
        toast.custom(() => (
          <SuccessToast message="Profile updated successfully" />
        ), { duration: 3000 });
        
        // Reset form state
        setIsLoading(false);
        setUploadingImage(false);
        setFormTouched(false);
        
        // Close the modal after successful save
        setIsEditProfileOpen(false);
        
        // Fully reload the page after a small delay to ensure data is saved
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      // Более информативное сообщение об ошибке
      const errorMessage = error.message || 'An error occurred while updating your profile';
      setError(errorMessage);
      
      // Показываем уведомление об ошибке
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setUploadingImage(false);
    }
  };
  
  // Close modal
  const handleClose = () => {
    if (formTouched) {
      // Could add confirmation dialog here
    }
    setIsEditProfileOpen(false);
    // Не сбрасываем форму при закрытии, чтобы сохранить данные для следующего открытия
  };
  
  // Reset form state
  const resetForm = () => {
    setImagePreview('');
    setFile(null);
    setImageUploaded(false);
    setIsLoading(false);
    setUploadingImage(false);
    setError('');
    setActiveTab('basic');
    setFormTouched(false);
  };
  
  // Get profile image
  const getProfileImage = () => {
    if (imagePreview) return imagePreview;
    if (currentProfile?.image && currentProfile.image.trim()) {
      try {
        return createBucketUrl(currentProfile.image, 'user');
      } catch (error) {
        console.error('Error getting profile image:', error);
        return '/images/placeholders/user-placeholder.svg';
      }
    }
    return '/images/placeholders/user-placeholder.svg';
  };
  
  if (!isEditProfileOpen) return null;
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="overlay"
        className="fixed inset-0 z-50 flex items-center justify-center pt-20 pb-4 px-4 bg-black/60 backdrop-blur-sm"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.div
          className="relative w-full max-w-md overflow-hidden rounded-2xl"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Glass card with subtle gradient */}
          <div className="glass-card bg-gradient-to-br from-[#24183D]/90 to-[#1A1E36]/95 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.37)] backdrop-blur-xl overflow-hidden">
            {/* Header */}
            <div className="relative p-6 border-b border-white/10 bg-white/5">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
                  Edit Profile
                </h2>
                <motion.button
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                >
                  <MdClose className="text-white" size={20} />
                </motion.button>
              </div>
              
              {/* Tabs */}
              <div className="flex mt-4 border-b border-white/10">
                {['basic', 'social'].map((tab) => (
                  <motion.button
                    key={tab}
                    className={`px-5 py-2 font-medium transition-all ${
                      activeTab === tab 
                        ? 'text-[#20DDBB] border-b-2 border-[#20DDBB] relative'
                        : 'text-white/70 hover:text-white border-b-2 border-transparent'
                    }`}
                    onClick={() => setActiveTab(tab)}
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 0 }}
                  >
                    {tab === 'basic' ? 'Profile' : 'Social Links'}
                    {activeTab === tab && (
                      <motion.span
                        className="absolute inset-0 bg-[#20DDBB]/10 rounded-t-lg -z-10"
                        layoutId="activeTab"
                        initial={false}
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
            
            {/* Content area with max height and scrolling */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <AnimatePresence mode="wait">
                {/* Basic Info Tab */}
                {activeTab === 'basic' && (
                  <motion.div
                    key="basic-tab"
                    variants={tabVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-5"
                  >
                    {/* Profile Photo Preview at the top of Basic Info */}
                    <motion.div 
                      className="flex flex-col items-center mb-6"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="relative group">
                        <div className="w-40 h-40 rounded-xl overflow-hidden border-2 border-[#20DDBB]/30 shadow-[0_0_15px_rgba(32,221,187,0.2)] mb-2">
                          <img
                            src={getProfileImage()}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                          <motion.div 
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            whileHover={{ opacity: 1 }}
                          >
                            <button
                              className="bg-[#20DDBB] text-black font-medium py-2 px-4 rounded-lg flex items-center gap-2"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <BsImage size={18} />
                              <span>Change</span>
                            </button>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleFileChange}
                            />
                          </motion.div>
                        </div>
                        
                        {/* Verification badge */}
                        {currentProfile?.verified && (
                          <motion.div
                            className="absolute -bottom-2 -right-2 bg-[#20DDBB]/20 p-1.5 rounded-full border border-[#20DDBB]/50"
                            animate={{ 
                              boxShadow: ['0 0 5px rgba(32,221,187,0.3)', '0 0 15px rgba(32,221,187,0.6)', '0 0 5px rgba(32,221,187,0.3)']
                            }}
                            transition={{ 
                              duration: 2, 
                              repeat: Infinity,
                              repeatType: 'reverse' 
                            }}
                          >
                            <MdVerified className="text-[#20DDBB]" size={16} />
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                    
                    {/* Image Cropper - Show only when an image is selected but not yet uploaded */}
                    {imagePreview && !imageUploaded && (
                      <motion.div
                        className="w-full mb-5 bg-[#24183D]/70 rounded-xl border border-white/10 p-3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="mb-2 text-center text-sm text-[#A6B1D0]">
                          Adjust your profile photo
                        </div>
                        
                        <div className="max-h-[300px] overflow-hidden rounded-lg">
                          <Cropper
                            src={imagePreview}
                            onChange={(cropper) => setCropper(cropper)}
                            className="h-[250px]"
                            stencilProps={{
                              aspectRatio: 1,
                              grid: true
                            }}
                          />
                        </div>
                        
                        {/* Upload progress bar */}
                        {isSavingImage && uploadProgress > 0 && (
                          <div className="mt-3">
                            <div className="h-1.5 w-full bg-gray-700/50 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-gradient-to-r from-[#20DDBB] to-[#5D59FF]"
                                initial={{ width: '0%' }}
                                animate={{ width: `${uploadProgress}%` }}
                                transition={{ ease: "easeInOut" }}
                              />
                            </div>
                            <div className="text-xs text-[#A6B1D0] mt-1 text-right">
                              {uploadProgress < 100 ? `Uploading: ${uploadProgress}%` : 'Upload complete!'}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-end mt-2">
                          <motion.button
                            className={`py-2 px-4 rounded-lg transition-all font-medium flex items-center gap-2
                                      ${isSavingImage
                                        ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-[#20DDBB]/20 to-[#5D59FF]/20 hover:from-[#20DDBB]/30 hover:to-[#5D59FF]/30 text-[#20DDBB]'}`}
                            whileHover={!isSavingImage ? { y: -2, boxShadow: '0 8px 20px rgba(32, 221, 187, 0.15)' } : {}}
                            whileTap={!isSavingImage ? { y: 0 } : {}}
                            onClick={handleCrop}
                            disabled={isSavingImage}
                          >
                            {isSavingImage ? (
                              <>
                                <div className="w-5 h-5 rounded-full border-2 border-t-[#20DDBB] border-r-[#5D59FF] border-b-[#20DDBB]/30 border-l-[#5D59FF]/30 animate-spin mr-1" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <IoCheckmarkCircle size={18} />
                                <span>Apply</span>
                              </>
                            )}
                          </motion.button>
                        </div>
                      </motion.div>
                    )}

                    {/* Name field with animation */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <label className="block text-white mb-2 font-medium">
                        Username<span className="text-[#20DDBB]">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setFormTouched(true);
                        }}
                        className="w-full bg-[#24183D]/70 text-white rounded-xl p-3 border border-white/10 focus:border-[#20DDBB] outline-none transition-all focus:shadow-[0_0_15px_rgba(32,221,187,0.15)]"
                        placeholder="Your name"
                      />
                    </motion.div>
                    
                    {/* Role field - Replace with badge buttons */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <label className="block text-white mb-2 font-medium">Role</label>
                      <div className="flex flex-wrap gap-2">
                        {roleOptions.map((option) => (
                          <motion.button
                            key={option.id}
                            type="button"
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                              role === option.label
                                ? 'bg-gradient-to-r from-[#20DDBB] to-[#5D59FF] text-black shadow-[0_2px_10px_rgba(32,221,187,0.3)]'
                                : 'bg-[#24183D]/70 text-white/80 hover:text-white hover:bg-[#24183D] border border-white/10'
                            }`}
                            onClick={() => {
                              setRole(option.label);
                              setFormTouched(true);
                            }}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            {option.id === 'artist' && <IoMdMusicalNotes className="text-[#20DDBB]" />}
                            {option.id === 'producer' && <MdOutlineWorkOutline className="text-[#20DDBB]" />}
                            {option.id === 'dj' && <BsVinylFill className="text-[#20DDBB]" />}
                            {option.id === 'vocalist' && <FaMicrophone className="text-[#20DDBB]" />}
                            {option.id === 'listener' && <FaHeadphones className="text-[#20DDBB]" />}
                            {option.id === 'label' && <BsTag className="text-[#20DDBB]" />}
                            {option.label}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                    
                    {/* Location field with detect button */}
                    <div className="space-y-2">
                      <label htmlFor="location" className="text-white/80 text-sm flex justify-between items-center">
                        <span>Location</span>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleDetectLocation}
                          disabled={isDetectingLocation}
                          className="text-xs text-[#20DDBB] hover:text-[#20DDBB]/80 flex items-center gap-1 disabled:opacity-50"
                        >
                          <MdLocationOn size={14} />
                          {isDetectingLocation ? 'Detecting...' : 'Detect location'}
                        </motion.button>
                      </label>
                      <div className="relative">
                        <MdLocationOn className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                          id="location"
                          type="text"
                          placeholder="Your location"
                          value={location}
                          onChange={(e) => {
                            setLocation(e.target.value);
                            setFormTouched(true);
                          }}
                          className="w-full bg-white/5 text-white rounded-lg border border-white/10 focus:border-[#20DDBB]/50 focus:ring-1 focus:ring-[#20DDBB]/50 pl-10 py-2.5 outline-none transition"
                        />
                      </div>
                    </div>
                    
                    {/* Website field */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <label className="block text-white mb-2 font-medium">Website</label>
                      <div className="relative">
                        <BsLink45Deg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#20DDBB]" />
                        <input
                          type="text"
                          value={website}
                          onChange={(e) => {
                            setWebsite(e.target.value);
                            setFormTouched(true);
                          }}
                          className="w-full bg-[#24183D]/70 text-white rounded-xl p-3 pl-10 border border-white/10 focus:border-[#20DDBB] outline-none transition-all focus:shadow-[0_0_15px_rgba(32,221,187,0.15)]"
                          placeholder="Your website URL"
                        />
                      </div>
                    </motion.div>
                    
                    {/* Bio field */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <label className="block text-white mb-2 font-medium">Bio</label>
                      <textarea
                        value={bio}
                        onChange={(e) => {
                          setBio(e.target.value);
                          setFormTouched(true);
                        }}
                        className="w-full bg-[#24183D]/70 text-white rounded-xl p-3 border border-white/10 focus:border-[#20DDBB] outline-none min-h-[100px] resize-none transition-all focus:shadow-[0_0_15px_rgba(32,221,187,0.15)]"
                        placeholder="Tell us about yourself"
                      />
                    </motion.div>
                  </motion.div>
                )}
                
                {/* Social Tab */}
                {activeTab === 'social' && (
                  <motion.div
                    key="social-tab"
                    variants={tabVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-5"
                  >
                    <p className="text-[#A6B1D0] text-sm">
                      Connect your social profiles to help people find you across platforms.
                    </p>
                    
                    {/* Social links inputs */}
                    {Object.entries(socialLinks).map(([platform, value], index) => {
                      const { icon: Icon, color } = socialIcons[platform as keyof typeof socialIcons];
                      
                      return (
                        <motion.div
                          key={platform}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="relative"
                        >
                          <label className="block text-white mb-2 font-medium capitalize">
                            {platform}
                          </label>
                          <div className="relative">
                            <div 
                              className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center"
                              style={{ color }}
                            >
                              <Icon />
                            </div>
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => handleSocialLinkChange(platform as keyof SocialLinks, e.target.value)}
                              className="w-full bg-[#24183D]/70 text-white rounded-xl p-3 pl-10 border border-white/10 focus:border-[#20DDBB] outline-none transition-all focus:shadow-[0_0_15px_rgba(32,221,187,0.15)]"
                              placeholder={`Your ${platform} profile URL`}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Error message */}
              {error && (
                <motion.div 
                  className="mt-4 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {error}
                </motion.div>
              )}
              
              {/* Form actions - Remove Cancel button, keep only Save */}
              <div className="mt-6 flex justify-end">
                <motion.button
                  className="relative overflow-hidden py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#20DDBB] to-[#5D59FF] text-black font-medium hover:shadow-[0_5px_15px_rgba(32,221,187,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={isLoading || uploadingImage}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 rounded-full border-2 border-t-black border-r-transparent border-b-black/30 border-l-transparent animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>Save Profile</span>
                      <HiOutlineSparkles className="text-black/70" />
                    </>
                  )}
                  
                  {/* Button hover effect */}
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#5D59FF]/80 to-[#20DDBB]/80 opacity-0 hover:opacity-100 transition-opacity"
                    initial={false}
                    whileHover={{ opacity: 1 }}
                  />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
      
      {/* CSS for glass effect */}
      <style jsx global>{`
        .glass-card {
          position: relative;
          z-index: 1;
        }
        
        .glass-card::before {
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
      `}</style>
    </AnimatePresence>
  );
};

export default EnhancedEditProfileOverlay; 