"use client";
import { useEffect, useState } from "react"
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
 
export default function EditProfileOverlay() {
    
    let { currentProfile, setCurrentProfile } = useProfileStore()
    let { setIsEditProfileOpen } = useGeneralStore()

    const contextUser = useUser()
    const router = useRouter()

    const [file, setFile] = useState<File | null>(null);
    const [cropper, setCropper] = useState<CropperDimensions | null>(null);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [userImage, setUserImage] = useState<string | ''>('');
    const [userName, setUserName] = useState<string | ''>('');
    const [userBio, setUserBio] = useState<string | ''>('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<ShowErrorObject | null>(null)

    useEffect(() => {
        setUserName(currentProfile?.name || '')
        setUserBio(currentProfile?.bio || '')
        setUserImage(currentProfile?.image || '')
    }, [])

    console.log('Initial user image:', currentProfile?.image);
    console.log('NEXT_PUBLIC_PLACEHOLDER_DEAFULT_IMAGE_ID:', process.env.NEXT_PUBLIC_PLACEHOLDER_DEAFULT_IMAGE_ID);
    

    const optimizeImage = async (file: File): Promise<File> => {
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
                                // Показываем уведомление об успешной оптимизации
                                const originalSize = (file.size / 1024).toFixed(2);
                                const optimizedSize = (blob.size / 1024).toFixed(2);
                                toast.success(
                                    `Image optimized successfully!\nOriginal: ${originalSize}KB\nOptimized: ${optimizedSize}KB`,
                                    { duration: 3000 }
                                );
                                resolve(optimizedFile);
                            } else {
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

    const getUploadedImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files && event.target.files[0];
        
        if (selectedFile) {
            try {
                const optimizedFile = await optimizeImage(selectedFile);
                setFile(optimizedFile);
                setUploadedImage(URL.createObjectURL(optimizedFile));
            } catch (error) {
                console.error('Error optimizing image:', error);
            setFile(null);
            setUploadedImage(null);
        }
    }
    };

    const updateUserInfo = async () => {
        let isError = validate()
        if (isError) return
        if (!contextUser?.user) return
        
        try {
            setIsUpdating(true)
            await useUpdateProfile(currentProfile?.id || '', userName, userBio)
            setCurrentProfile(contextUser?.user?.id)
            setIsEditProfileOpen(false)
            router.refresh()
            
        } catch (error) {
            console.log(error)
        }
    }

    const cropAndUpdateImage = async () => {
        let isError = validate()
        if (isError) return
        if (!contextUser?.user) return

        try {
            if (!file) return alert('You have no file')
            if (!cropper) return alert('You have no file')
            setIsUpdating(true)

            const newImageId = await useChangeUserImage(file, cropper, userImage)
            await useUpdateProfileImage(currentProfile?.id || '', newImageId)

            await contextUser.checkUser()
            setCurrentProfile(contextUser?.user?.id)
            
            // Обновляем локальное состояние изображения
            setUserImage(newImageId)
            setUploadedImage(null)
            setFile(null)
            setIsUpdating(false)
            toast.success('Profile photo updated successfully!')
        } catch (error) {
            console.log(error)
            setIsUpdating(false)
            toast.error('Failed to update profile photo')
        }
    }

    const showError = (type: string) => {
        if (error && Object.entries(error).length > 0 && error?.type == type) {
            return error.message
        }
        return ''
    }

    const validate = () => {
        setError(null)
        let isError = false

        if (!userName) {
            setError({ type: 'userName', message: 'A Username is required'})
            isError = true
        } 
        return isError
    }

    const getProfileImage = () => {
        if (uploadedImage) return uploadedImage;
        if (userImage) return useCreateBucketUrl(userImage);
        return '/images/placeholder-user.jpg';
    };

    return (
        <AnimatePresence>
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <motion.div className="relative w-full max-w-[700px] mx-4 bg-[#24183D] rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-[#2E2469]">
                        <h1 className="text-xl font-semibold text-white">Edit Profile</h1>
                        <button 
                            onClick={() => setIsEditProfileOpen(false)} 
                            className="p-2 hover:bg-[#2E2469] rounded-xl transition-colors"
                        >
                            <AiOutlineClose size={20} className="text-gray-400 hover:text-white" />
                        </button>
                    </div>

                    <div className="p-6">
                        {/* Profile Photo Section */}
                        <div className="mb-8">
                            <h3 className="text-gray-400 text-sm mb-4">Profile Photo</h3>
                            <div className="flex justify-center">
                                <label className="relative cursor-pointer group">
                                    <div className="relative w-[100px] h-[100px] rounded-2xl overflow-hidden bg-[#1E2136] transition-transform group-hover:scale-105">
                                        <img 
                                            src={getProfileImage()}
                                            className="w-full h-full object-cover"
                                            alt="Profile"
                                            onError={(e) => {
                                                console.log('Image load error, using placeholder');
                                                const target = e.target as HTMLImageElement;
                                                target.src = '/images/placeholder-user.jpg';
                                                target.onerror = null; // Предотвращаем бесконечный цикл
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <BsPencil size={24} className="text-white" />
                                        </div>
                                            </div>
                                        <input
                                        type="file"
                                            className="hidden"
                                            onChange={getUploadedImage}
                                        accept="image/png, image/jpeg, image/jpg, image/webp"
                                        />
                                </label>
                                    </div>
                                </div>

                        {/* Name Input */}
                        <div className="mb-6">
                            <h3 className="text-gray-400 text-sm mb-2">Name</h3>
                                            <TextInput 
                                                string={userName}
                                placeholder="Your name"
                                                onUpdate={setUserName}
                                                inputType="text"
                                                error={showError('userName')}
                                className="bg-[#2E2469] border-none focus:ring-2 focus:ring-[#20DDBB]"
                            />
                        </div>

                        {/* Bio Input */}
                        <div className="mb-6">
                            <h3 className="text-gray-400 text-sm mb-2">Bio</h3>
                            <textarea 
                                value={userBio}
                                onChange={(e) => setUserBio(e.target.value)}
                                maxLength={80}
                                placeholder="Tell us about yourself..."
                                className="w-full bg-[#2E2469] text-white rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#20DDBB] resize-none h-32"
                            />
                            <p className="text-right text-gray-400 text-sm mt-1">
                                {userBio.length}/80
                            </p>
                                </div>

                        {/* Compact Image Cropper */}
                        <AnimatePresence>
                            {uploadedImage && (
                                <motion.div 
                                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
                                >
                                    <div className="w-full max-w-md bg-[#24183D] rounded-2xl overflow-hidden">
                                        <div className="p-3 border-b border-[#2E2469] flex justify-between items-center">
                                            <h3 className="text-white text-sm">Adjust Photo</h3>
                                            <button 
                                                onClick={() => setUploadedImage(null)}
                                                className="text-gray-400 hover:text-white"
                                            >
                                                <AiOutlineClose size={16} />
                                            </button>
                                        </div>
                                        <div className="aspect-square w-full bg-black">
                                <Cropper
                                    stencilProps={{ aspectRatio: 1 }}
                                                className="h-[300px]"
                                    onChange={(cropper) => setCropper(cropper.getCoordinates())}
                                    src={uploadedImage}
                                />
                            </div>
                                        <div className="p-3 flex justify-end">
                                            <button
                                                onClick={cropAndUpdateImage}
                                                className="px-4 py-1.5 bg-[#20DDBB] text-black text-sm font-medium rounded-xl hover:bg-[#1CB99D] transition-colors"
                                            >
                                                {isUpdating ? (
                                                    <BiLoaderCircle className="animate-spin" />
                                                ) : (
                                                    'Apply'
                                                )}
                                            </button>
                                        </div>
                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 mt-8">
                                <button 
                                    onClick={() => setIsEditProfileOpen(false)}
                                className="px-4 py-2 text-white hover:bg-[#2E2469] rounded-xl transition-colors"
                                >
                                Cancel
                                </button>
                                <button 
                                onClick={updateUserInfo}
                                    disabled={isUpdating}
                                className="px-6 py-2 bg-[#20DDBB] text-black font-medium rounded-xl hover:bg-[#1CB99D] transition-colors disabled:opacity-50"
                            >
                                {isUpdating ? (
                                    <BiLoaderCircle className="animate-spin" />
                                ) : (
                                    'Save Changes'
                                )}
                                </button>
                            </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
