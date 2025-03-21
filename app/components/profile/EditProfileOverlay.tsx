"use client";
import { useEffect, useState, useRef } from "react"
import { Cropper } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css'
import TextInput from "../TextInput";
import { BsPencil } from "react-icons/bs";
import { AiOutlineClose } from "react-icons/ai";
import { useUser } from "@/app/context/user";
import { useRouter } from "next/navigation";
import { BiLoaderCircle } from "react-icons/bi";
import { CropperDimensions, ShowErrorObject } from "@/app/types";
import { useProfileStore } from "@/app/stores/profile";
import { useGeneralStore } from "@/app/stores/general";
import useUpdateProfile from "@/app/hooks/useUpdateProfile";
import useChangeUserImage from "@/app/hooks/useChangeUserImage";
import useUpdateProfileImage from "@/app/hooks/useUpdateProfileImage";
import useCreateBucketUrl from "@/app/hooks/useCreateBucketUrl";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from 'react-hot-toast';
import { IoClose, IoCamera, IoImageOutline, IoCloudUploadOutline, IoCheckmarkCircle } from "react-icons/io5";

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1,
        transition: { duration: 0.3 }
    },
};

const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
        opacity: 1, 
        scale: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 25
        }
    }
};

const inputVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
        opacity: 1,
        x: 0,
        transition: {
            delay: i * 0.1,
            duration: 0.5,
            ease: "easeOut"
        }
    })
};

// Custom success toast for profile updates
const SuccessToast = ({ message }: { message: string }) => (
    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#1A2338]/90 to-[#24183D]/90 backdrop-blur-md rounded-xl border border-green-500/30 shadow-lg">
        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
            <IoCheckmarkCircle className="text-green-400" size={20} />
        </div>
        <p className="text-white font-medium">{message}</p>
    </div>
);

// Специальный тост с аватаром пользователя
const ProfileUpdatedToast = ({ userName, avatarUrl }: { userName: string, avatarUrl: string }) => (
    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#1A2338]/90 to-[#24183D]/90 backdrop-blur-md rounded-xl border border-[#20DDBB]/30 shadow-lg">
        <div className="relative">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#20DDBB]/50">
                <img 
                    src={avatarUrl} 
                    alt={userName}
                    className="w-full h-full object-contain bg-[#1A1E36]" 
                />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-green-500/80 p-1 rounded-full">
                <IoCheckmarkCircle size={14} className="text-white" />
            </div>
        </div>
        <div>
            <p className="text-white font-medium">Profile Updated!</p>
            <p className="text-white/70 text-sm">{userName}'s profile has been updated</p>
        </div>
    </div>
);

const EditProfileOverlay = () => {
    const { setIsEditProfileOpen } = useGeneralStore();
    const { currentProfile, setCurrentProfile } = useProfileStore() as unknown as {
      currentProfile: { id: string; user_id: string; name: string; image: string; bio: string } | null;
      setCurrentProfile: (userId: string) => void;
    };
    const [name, setName] = useState(currentProfile?.name || '');
    const [bio, setBio] = useState(currentProfile?.bio || '');
    const [image, setImage] = useState<string>(currentProfile?.image || '');
    const [imagePreview, setImagePreview] = useState<string>('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<ShowErrorObject | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageLoading, setImageLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showPreview, setShowPreview] = useState(false);
    const [imageUploaded, setImageUploaded] = useState(false);

    const contextUser = useUser();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setName(currentProfile?.name || '')
        setBio(currentProfile?.bio || '')
        setImage(currentProfile?.image || '')
    }, [currentProfile])

    // Simulate progress for better user experience
    useEffect(() => {
        if (imageLoading && uploadProgress < 95) {
            const interval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 5, 95));
            }, 150);
            return () => clearInterval(interval);
        }
    }, [imageLoading, uploadProgress]);

    const optimizeImage = async (file: File): Promise<File> => {
        setImageLoading(true);
        setUploadProgress(0);
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Максимальные размеры для оптимизации
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
                    
                    let width = img.width;
                    let height = img.height;
                    
                    // Изменяем размер, сохраняя пропорции
                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    ctx?.drawImage(img, 0, 0, width, height);
                    
                    // Конвертируем в WebP с высоким качеством
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const optimizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                                    type: "image/webp"
                                });
                                setUploadProgress(100);
                                setImageLoading(false);
                                setImageUploaded(true);
                                resolve(optimizedFile);
                            } else {
                                setImageLoading(false);
                                reject(new Error("Failed to optimize image"));
                            }
                        },
                        'image/webp',
                        0.9
                    );
                };
            };
        });
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            try {
                setShowPreview(true);
                const optimizedFile = await optimizeImage(selectedFile);
                const imageUrl = URL.createObjectURL(optimizedFile);
                setImagePreview(imageUrl);
                setImageFile(optimizedFile);
                
                // Покажем красивое уведомление об успешной оптимизации
                const originalSize = (selectedFile.size / 1024).toFixed(2);
                const optimizedSize = (optimizedFile.size / 1024).toFixed(2);
                const sizeReduction = (100 - (parseFloat(optimizedSize) * 100 / parseFloat(originalSize))).toFixed(1);
                
                toast.custom((t) => (
                    <SuccessToast message={`Image optimized! Reduced by ${sizeReduction}%`} />
                ), { duration: 3000 });
                
            } catch (error) {
                console.error('Error optimizing image:', error);
                setImage('');
                setImagePreview('');
                setImageFile(null);
                setShowPreview(false);
                toast.error('Failed to process image. Please try another one.');
            }
        }
    };

    const handleSave = async () => {
        if (validate()) return;
        
        try {
            setIsUpdating(true);
            
            // First update profile info
            await useUpdateProfile(currentProfile?.id || '', name, bio);
            
            // Then update image if new one was selected
            let finalImageUrl = useCreateBucketUrl(image);
            
            if (imageFile) {
                const newImageId = await useChangeUserImage(imageFile, { 
                    left: 0, 
                    top: 0, 
                    width: 0, 
                    height: 0 
                }, currentProfile?.image || '');
                
                await useUpdateProfileImage(currentProfile?.id || '', newImageId);
                setImage(newImageId);
                finalImageUrl = useCreateBucketUrl(newImageId);
                setImagePreview('');
                setImageFile(null);
                setShowPreview(false);
                setImageUploaded(false);
            }
            
            setIsUpdating(false);
            
            toast.custom((t) => (
                <ProfileUpdatedToast userName={name} avatarUrl={finalImageUrl} />
            ), { duration: 3000 });
            
            // Update the profile in the store
            setCurrentProfile(contextUser?.user?.id || '');
            setIsEditProfileOpen(false);
            
            // We need to refresh the router to reflect changes
            router.refresh();
        } catch (error) {
            console.error('Error updating profile:', error);
            setIsUpdating(false);
            toast.error('Failed to update profile');
        }
    };

    const showError = (type: string) => {
        if (error && error.type === type) return error.message;
        return '';
    };

    const validate = () => {
        setError(null)
        let isError = false

        if (!name) {
            setError({ type: 'userName', message: 'A Username is required'})
            isError = true
        } 
        return isError
    }

    const getProfileImage = () => {
        if (imagePreview) return imagePreview;
        if (image && image !== process.env.NEXT_PUBLIC_PLACEHOLDER_DEAFULT_IMAGE_ID) {
            const imageUrl = useCreateBucketUrl(image);
            return imageUrl;
        }
        return '/images/placeholder-user.jpg';
    };

    return (
        <motion.div 
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            className="fixed inset-0 z-50 bg-[#120B20]/80 backdrop-blur-sm flex items-center justify-center px-4"
        >
            <motion.div 
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                className="relative w-full max-w-[500px] rounded-2xl overflow-hidden"
            >
                <div className="relative bg-gradient-to-br from-[#24183D]/90 to-[#1A1E36]/95 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
                    {/* Header with glass effect */}
                    <div className="relative px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">Edit Profile</h2>
                        <motion.button 
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsEditProfileOpen(false)}
                            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <IoClose size={20} className="text-white" />
                        </motion.button>
                    </div>

                    <div className="max-h-[80vh] overflow-y-auto">
                        <div className="p-6 space-y-6">
                            {/* Profile Image Section */}
                            <div className="sm:flex sm:gap-8 items-start">
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="relative w-40 h-40 rounded-2xl overflow-hidden group 
                                        ring-2 ring-white/10 hover:ring-[#20DDBB]/50 transition-all duration-300
                                        shadow-[0_0_15px_rgba(32,221,187,0.15)] flex items-center justify-center bg-[#1A1E36]/70"
                                >
                                    <motion.img 
                                        initial={{ scale: 1 }}
                                        whileHover={{ scale: 1.05 }}
                                        src={getProfileImage()}
                                        alt="Profile"
                                        className="max-w-full max-h-full object-contain"
                                    />
                                    <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 
                                        opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer
                                        backdrop-blur-sm">
                                        <input 
                                            ref={fileInputRef}
                                            type="file" 
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                        <motion.div
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="w-12 h-12 rounded-full bg-[#20DDBB]/20 flex items-center justify-center mb-2"
                                        >
                                            <IoCloudUploadOutline size={24} className="text-[#20DDBB]" />
                                        </motion.div>
                                        <span className="text-white text-sm font-medium">Upload new image</span>
                                    </label>
                                </motion.div>

                                {/* Form Fields */}
                                <div className="flex-1 space-y-6">
                                    <motion.div 
                                        variants={inputVariants}
                                        custom={0}
                                        initial="hidden"
                                        animate="visible"
                                    >
                                        <label className="block text-white/90 mb-2 font-medium">Username</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl 
                                                px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#20DDBB]/50
                                                hover:border-white/20 transition-all duration-300"
                                            placeholder="Your name"
                                        />
                                        {showError('userName') && (
                                            <p className="text-red-400 text-sm mt-1">{showError('userName')}</p>
                                        )}
                                    </motion.div>

                                    <motion.div
                                        variants={inputVariants}
                                        custom={1}
                                        initial="hidden"
                                        animate="visible"
                                    >
                                        <label className="block text-white/90 mb-2 font-medium">Bio</label>
                                        <textarea
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl 
                                                px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#20DDBB]/50
                                                hover:border-white/20 transition-all duration-300 min-h-[100px] resize-none"
                                            placeholder="Tell about yourself"
                                        />
                                    </motion.div>

                                    <p className="mt-3 text-sm text-white/60 flex items-center gap-1.5">
                                        <IoCamera size={14} className="text-[#20DDBB]" /> 
                                        <span>Your image will be preserved in its original format</span>
                                    </p>
                                </div>
                            </div>

                            {/* Save Button */}
                            <motion.div 
                                variants={inputVariants}
                                custom={2}
                                initial="hidden"
                                animate="visible"
                                className="sticky bottom-0 left-0 right-0 pt-4"
                            >
                                <motion.button
                                    whileHover={{ scale: 1.02, boxShadow: "0 0 25px rgba(32,221,187,0.3)" }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleSave}
                                    disabled={isUpdating}
                                    className="w-full bg-gradient-to-r from-[#20DDBB] to-[#20DDBB]/80 
                                        text-black font-medium py-3 rounded-xl transition-all duration-300
                                        hover:shadow-[0_0_20px_rgba(32,221,187,0.3)]
                                        disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUpdating ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                            <span>Saving profile...</span>
                                        </div>
                                    ) : 'Save Changes'}
                                </motion.button>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default EditProfileOverlay;
