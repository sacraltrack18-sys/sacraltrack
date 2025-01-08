import React, { useState } from 'react';
import useUpdatePost from "@/app/hooks/useUpdatePost";
import { convertWavToMp3 } from '@/app/utils/audioConverter';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { useUser } from "@/app/context/user"
import toast from 'react-hot-toast';
import Link from 'next/link';
import { BiLoaderCircle, BiSolidCloudUpload } from "react-icons/bi"
import { AiOutlineCheckCircle } from "react-icons/ai";
import { AiOutlineClose } from "react-icons/ai"; 
import CustomAudioPlayer from '@/app/utils/customPlayer'; 




interface Post {
    id: string;
    audioUrl: string; // Keep the camelCase naming consistent
    imageUrl: string;
    caption: string;
    trackname: string;
    updated_at: string; // Make sure this is required
    created_at: string; // Ensure this is required
}

interface PostWithProfile extends Post {
    profile: {
        user_id: string;  // User ID in profile
        name: string;     // User's name
        image: string;    // URL to user's profile image
    };
}

interface EditTrackPopupProps {
    postData: PostWithProfile; // Change is from Post to PostWithProfile
    onUpdate: (data: PostWithProfile | null) => void; 
    onClose: () => void;
}


const EditTrackPopup: React.FC<EditTrackPopupProps> = ({ postData, onUpdate, onClose }) => {
    const contextUser = useUser();
    const [caption, setCaption] = useState<string>(postData.caption); // Начальная инициализация
    const [fileAudio, setAudioFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState(postData.imageUrl);
    const [error, setError] = useState<string | null>(null);
    const [showPopup, setShowPopup] = useState(true);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [trackname, setTrackname] = useState<string>(postData.trackname); // Начальная инициализация
    const [fileDisplayImage, setFileDisplayImage] = useState<string | null>(null); // Для хранения изображения
    const [trackProgress, setTrackProgress] = useState<number>(0); // Для хранения прогресса загрузки


    const handleFinalUpdate = async () => {
        if (!contextUser || !contextUser.user) {
            toast.error('Failed to get user data.');
            return;
        }

        setIsUploading(true); // Устанавливаем состояние загрузки в true
        setTrackProgress(0); // Сбрасываем прогресс

        try {
            let mp3File: File | null = null;
            const ffmpeg = new FFmpeg();
            await ffmpeg.load();

            if (trackname.trim().length > 30) {
                toast.error('Type trackname no longer than 30 characters.', { duration: 3000 });
                return;
            }

            if (typeof caption !== 'string' || caption.trim().length > 300) {
                toast.error('Type a track description.', { duration: 3000 });
                return;
            }

            if (fileAudio && fileAudio.type === 'audio/wav') {
                const conversionResult = await convertWavToMp3(ffmpeg, fileAudio);
                if (typeof conversionResult === 'object' && 'error' in conversionResult) {
                    const errorMessage = (conversionResult.error as { message?: string }).message || 'Error converting.';
                    toast.error(errorMessage);
                    return;
                }
                mp3File = new File([conversionResult.mp3Blob], 'track.mp3', { type: 'audio/mp3' });
            } else {
                mp3File = fileAudio;
            }

            // Симуляция загрузки с обновлением прогресса
            let progressInterval = setInterval(() => {
                setTrackProgress(prev => {
                    if (prev < 100) {
                        return prev + 10; // Увеличиваем прогресс на 10%
                    } else {
                        clearInterval(progressInterval);
                        return 100;
                    }
                });
            }, 500); // Каждые 500 мс обновляем прогресс

            await useUpdatePost(
                postData.id,
                contextUser.user.id,
                caption.toString(),
                trackname.toString(),
                fileAudio,
                mp3File,
                imageFile,
            );

            

            clearInterval(progressInterval);
            setTrackProgress(100); // Устанавливаем финальный прогресс в 100

            onUpdate(null);
            toast.success('Track updated successfully!', { duration: 3000 });
        } catch (error) {
            console.error("Ошибка при обновлении поста:", error);
            const errorMessage = (error as { message?: string }).message || 'Ошибка при обновлении поста. Попробуйте снова.';
            toast.error(errorMessage);
        } finally {
            setIsUploading(false); // Завершаем загрузку, независимо от результата
            setTrackProgress(0); // Сбрасываем прогресс
        }
    };

    const onChangeAudio = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            setAudioFile(file);
        }
    };

    const onChangeImage = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
          const file = files[0];
          const fileUrl = URL.createObjectURL(file);
          setImageFile(file);
          setImageUrl(fileUrl);
          setFileDisplayImage(fileUrl); // Устанавливаем URL изображения для отображения
        }
      };
    
      // Очистка изображения
      const clearImage = () => {
        setImageFile(null);
        setFileDisplayImage(null);
        setImageUrl(postData.imageUrl); // Сброс к начальному изображению
      };


      

    return (
        <div>
            {showPopup && (
                <div className="fixed z-[990] top-0 left-0 right-0 bottom-0 bg-[#15191F] bg-opacity-80 backdrop-blur-lg flex justify-center items-center">
                <div className="bg-[#15161A] md:w-[600px] z-[999] relative p-2 rounded-2xl shadow-xl max-w-md w-full ">
                        <h1 className="text-[15px] font-bold ml-4 mt-2 mb-2">Edit a track</h1>

                       {/* UPLOAD ARTWORK */}
                   
                    <div className="mx-auto mt-5 mb-6 w-full h-[180px] text-center p-1 border-2 border-dashed border-[#1E2136] rounded-2xl hover:bg-[#1E2136] cursor-pointer">
                        {!fileDisplayImage ? (
                            <label
                                htmlFor="fileInputImage"
                                className="flex flex-col items-center justify-center h-full text-center p-1 cursor-pointer"
                            >
                                <p className="mt-2 text-[13px]">Select image to upload</p>
                                <p className="mt-1.5 text-gray-500 text-[13px]">Or drag and drop a file</p>
                                <p className="mt-4 text-gray-400 text-sm">JPEG, PNG</p>
                                <p className="mt-2 text-gray-400 text-[13px]">Up to 5 MB</p>
                                <input 
                                    type="file" 
                                    id="fileInputImage"
                                    onChange={onChangeImage}
                                    hidden 
                                    accept=".jpg, .jpeg, .png" 
                                />
                            </label>
                        ) : (
                            <div className="relative flex items-center justify-center h-full p-2 rounded-2xl cursor-pointer">
                                {isUploading && (
                                    <div className="absolute flex items-center justify-center z-20 h-full w-full">
                                        <BiLoaderCircle className="animate-spin" color="#F12B56" size={30} />
                                    </div>
                                )}
                                <img
                                    className="absolute rounded-xl object-cover z-10 w-full h-full"
                                    src={fileDisplayImage} // Используем URL изображения для отображения
                                    alt="Selected Image"
                                />
                                <div className="absolute -bottom-12 flex items-center justify-between z-50 rounded-xl w-full p-2">
                                    <div className="flex items-center truncate">
                                        <AiOutlineCheckCircle size="16" className="min-w-[16px]" />
                                        <p className="text-[11px] pl-1 truncate">{imageFile?.name}</p>
                                    </div>
                                    <button onClick={clearImage} className="text-[11px] ml-2 font-semibold">
                                        Change
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                
                    {/* UPLOAD A TRACK */}
                    <div className="mb-6">
                            <input
                                type="file"
                                accept=".wav"
                                style={{ backgroundColor: '#1E2136' }}
                                id="audioInput"
                                onChange={onChangeAudio}
                                hidden
                            />
                            <div className="flex items-center justify-center h-full w-full rounded-2xl">
                                <label htmlFor="audioInput" className="cursor-pointer w-full h-[60px] bg-[#5A86F8] hover:bg-[#486dcb] rounded-2xl flex items-center justify-center text-[14px] font-bold">
                                    <p className='mr-8'>Upload a track</p>        {fileAudio && <CustomAudioPlayer src={URL.createObjectURL(fileAudio)} />}
                                </label>
                            </div>
                    
                        </div>

                        {error && <p className="text-red-500">{error}</p>}

                           {/* Прогресс бар (это место, где вы вставляете код прогресс-бара) 
                        {isUploading && (
                            <div className="w-full bg-gray-600 rounded-full h-2 mb-4">
                                <div
                                    className={`bg-[#20DDBB] h-full rounded-full`}
                                    style={{ width: `${trackProgress}%` }} // Устанавливаем ширину прогресс-бара
                                />
                            </div>
                        )} */}


                        {/* TRACK NAME */}

                        <input
                            type="text"
                            placeholder="trackname"
                            style={{ backgroundColor: '#1E2136' }}
                            value={trackname}
                            maxLength={30} // Optional: limits user input to 30 characters
                            onChange={(e) => setTrackname(e.target.value)} // Убедитесь, что значение обновляется
                            className="w-full border bg-[#1A1F2B] border-[#2e3463] rounded-xl p-3 mb-6 text-[14px]"
                        />

                          {/* DESCRIPTION */}

                        <textarea
                            placeholder="Description"
                            value={caption}
                            maxLength={300}
                            style={{ backgroundColor: '#1E2136' }}
                            onChange={(e) => {
                                setCaption(e.target.value);
                                console.log("Текущее значение caption:", e.target.value); // Для отладки
                            }}
                            className="w-full bg-[#1A1F2B border-gray-300 rounded-xl p-2 mb-6 text-[14px] resize-none"

                        />

                        
               {/*         <select
                            value={genre}
                            style={{ backgroundColor: '#1E2136' }}
                            onChange={(e) => setGenre(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded mb-4"
                        >
                            <option value="">Выбрать жанр</option>
                            {genres.map((g) => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                       */}


                           {/*  RELEASE */}
                        <div className="flex justify-between">

                        <button
                            disabled={isUploading} // Disable the button when uploading
                            onClick={handleFinalUpdate}
                            className="px-10 py-4 mt-4 text-[13px] text-white cursor-pointer bg-[#20DDBB] hover:bg-[#8baea7] rounded-2xl mr-4 flex items-center font-bold justify-center" // Added flex for horizontal alignment
                        >
                            {isUploading ? (
                                <>
                                    <BiLoaderCircle className="animate-spin mr-2" color="#ffffff" size={25} />
                                    <span>Uploading...</span> {/* You can change this text as needed */}
                                </>
                            ) : (
                                'Release'
                            )}
                        </button>

                        <p className="text-[13px] text-[#838383] mt-4">
                            By clicking the "release" button you automatically agree with the 
                            <Link href="/terms" className="text-[#018CFD] hover:underline"> Sacral Track Terms of use</Link>
                        </p>
                        </div>

                        {/* CLOSE BUTTON */}
                        <button
                            onClick={() => setShowPopup(false)}
                            className="text-white px-4 py-2 rounded absolute top-[13px] right-2"
                        >
                            <AiOutlineClose size={14} /> {/* Здесь используем иконку закрытия */}
                        </button>
                    </div>
                </div>
            )}
                    {error && <div className="error-message">{error}</div>} {/* Здесь отображаем только текст ошибки */}

        </div>
    );
};

export default EditTrackPopup;
