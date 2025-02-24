"use client"

{/*UPLOAD PAGE*/}

import React, { useEffect, useState, useCallback, ChangeEvent } from "react";
import UploadLayout from "../layouts/UploadLayout"; 
import { BiLoaderCircle, BiSolidCloudUpload } from "react-icons/bi"
import { AiOutlineCheckCircle, AiOutlineClose } from "react-icons/ai";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/context/user"
import { UploadError } from "../types";
import ProgressBar from "../components/ProgressBar";
import { useCreatePost } from "@/app/hooks/useCreatePost";
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import toast from 'react-hot-toast';
import Link from "next/link";
//import UploadModal from "@/app/components/UploadModal";
import { convertWavToMp3, createM3U8File, segmentAudio, optimizeImage, initFFmpeg } from '@/app/utils/streaming'; // Импортируем нужные функции
import { AudioUploadPreloader } from "@/app/components/AudioUploadPreloader";
import { ImageUploadPreloader } from "@/app/components/ImageUploadPreloader";
import { BsFillPlayFill, BsFillPauseFill } from 'react-icons/bs';

// В начале файла, после импортов
const genres = [
    'Genres', 
    'Afro house', 
    'Acapella', 
    'Ai', 
    'Ambient', 
    'Bass', 
    'Deep', 
    'Deep bass', 
    'Downtempo', 
    'Dubstep', 
    'DnB', 
    'Electronic', 
    'Electro', 
    'Films', 
    'Jazz', 
    'Games', 
    'Hip-hop', 
    'House', 
    'Instrumental', 
    'K-pop', 
    'Lo-fi', 
    'Meditative', 
    'Minimal', 
    'Neurofunk', 
    'Poetry', 
    'Psychedelic', 
    'Rave', 
    'Rap', 
    'Street music', 
    'Techno', 
    'Minimal techno', 
    'Melodic techno', 
    'Trap'
];

// В начале компонента
type ProcessedFiles = {
    mp3Blob: Blob | null;
    segments: File[];
    m3u8File: File | null;
};

// В начале файла добавим тип для статистики обработки
type ProcessingStats = {
    stage: string;
    progress: number;
    details?: string;
};

// Добавим общий компонент для прогресс-бара
const UploadProgress = ({ stage, progress }: { stage: string; progress: number }) => (
    <div className="bg-[#1A1A1A] p-4">
        <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
                <span>{stage}</span>
                <span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-[#20DDBB] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    </div>
);

export default function Upload() {
    const contextUser = useUser()
    const router = useRouter() 
    const [trackProgress, setTrackProgress] = useState(0);
    const [genre, setGenre] = useState(''); // State to hold the selected genre
    const [isPostClicked, setIsPostClicked] = useState(false);
    const [mp3Blob, setMp3Blob] = useState<Blob | null>(null);
    const [mp3Url, setMp3Url] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(true); // State to control modal visibility
    const [useStreaming, setUseStreaming] = useState(false); // новый флаг
    const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

    


    // Modal
    const closeModal = () => {
        setIsModalOpen(false);
    };
    
    const handleGenreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setGenre(e.target.value);
    };

    // Include selectedGenre in your createNewPos

    let [fileDisplayAudio, setFileDisplayAudio] = useState<string>('');
    let [fileAudio, setFileAudio] = useState<File | null>(null);
    let [isUploading, setIsUploading] = useState<boolean>(false);
    let [trackname, setTrackname] = useState<string>('');
    let [Mp3File, setMp3File] = useState<File | null>(null); 
    
    // Separating the file state and display for image and audio
    let [fileDisplayImage, setFileDisplayImage] = useState<string>('');
    let [imageFile, setFileImage] = useState<File | null>(null);
    let [imageUploaded, setImageUploaded] = useState(false);

    let [error, setError] = useState<UploadError | null>(null);

    const [isFFmpegReady, setIsFFmpegReady] = useState(false);
    const [isFFmpegLoading, setIsFFmpegLoading] = useState(false);
    const [conversionProgress, setConversionProgress] = useState(0);

    // Добавим новое состояние для хранения обработанных файлов
    const [processedFiles, setProcessedFiles] = useState<ProcessedFiles>({
        mp3Blob: null,
        segments: [],
        m3u8File: null
    });

    // В начале компонента добавьте новое состояние
    const [isImageUploading, setIsImageUploading] = useState<boolean>(false);

    // Добавьте новые состояния
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStage, setUploadStage] = useState('');
    const [estimatedTimeLeft, setEstimatedTimeLeft] = useState<number | null>(null);

    // Добавим новое состояние для отслеживания процесса релиза
    const [isReleasing, setIsReleasing] = useState(false);

    // Добавьте новое состояние для контроля видимости выпадающего списка
    const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false);

    // Добавьте новые состояния для отслеживания прогресса обработки аудио
    const [audioProcessingProgress, setAudioProcessingProgress] = useState(0);
    const [audioProcessingStage, setAudioProcessingStage] = useState('');
    const [isAudioProcessing, setIsAudioProcessing] = useState(false);

    // Добавьте новое состояние для статистики конвертации
    const [conversionStats, setConversionStats] = useState<string>('');

    // Добавьте функцию для обработки выбора жанра
    const handleGenreSelect = (selectedGenre: string) => {
        setGenre(selectedGenre);
        setIsGenreDropdownOpen(false);
    };

    const [isFFmpegInitialized, setIsFFmpegInitialized] = useState(false);

    // Инициализация FFmpeg при загрузке компонента
    useEffect(() => {
        const initializeFFmpeg = async () => {
            try {
                setIsFFmpegLoading(true);
                await initFFmpeg();
                setIsFFmpegInitialized(true);
                setIsFFmpegReady(true); // Обновляем оба состояния
            } catch (error) {
                console.error('Failed to initialize FFmpeg:', error);
                toast.error('Failed to initialize audio processing. Please refresh the page.');
            } finally {
                setIsFFmpegLoading(false);
            }
        };

        if (!isFFmpegInitialized && !isFFmpegLoading) {
            initializeFFmpeg();
        }
    }, [isFFmpegInitialized, isFFmpegLoading]);

    /* Helper functionY*/ 

    function base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }
    useEffect(() => {
        if (!contextUser?.user) router.push('/');
    }, [contextUser]);


    // Обновим функцию onChangeAudio
    const onChangeAudio = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files?.length) return;

        const file = files[0];
        if (!file.type.startsWith('audio/')) {
            toast.error('Please select an audio file');
            return;
        }

        try {
            setIsAudioProcessing(true);
            setAudioProcessingProgress(0);
            setAudioProcessingStage('Starting audio processing...');

            // 1. Конвертация WAV в MP3 (0-40%)
            const mp3Blob = await convertWavToMp3(file, (stats) => {
                setAudioProcessingStage(stats.stage);
                setAudioProcessingProgress(stats.progress * 0.4);
                if (stats.details) {
                    setConversionStats(stats.details);
                }
            });

            // Создаем File из Blob
            const mp3File = new File([mp3Blob], file.name.replace(/\.[^/.]+$/, '.mp3'), {
                type: 'audio/mp3'
            });
            setMp3File(mp3File);

            // 2. Сегментация для HLS (40-80%)
            setAudioProcessingStage('Creating segments for streaming...');
            const segments = await segmentAudio(mp3Blob, (stats) => {
                setAudioProcessingStage(stats.stage);
                setAudioProcessingProgress(40 + stats.progress * 0.4);
                if (stats.details) {
                    setConversionStats(stats.details);
                }
            });

            // 3. Создание M3U8 плейлиста (80-100%)
            setAudioProcessingStage('Generating playlist...');
            const m3u8File = createM3U8File(segments);
            setAudioProcessingProgress(90);

            // Сохраняем все обработанные файлы
            setProcessedFiles({
                mp3Blob,
                segments,
                m3u8File
            });

            setAudioProcessingProgress(100);
            setAudioProcessingStage('Audio processing complete!');
            toast.success('Audio processed successfully!');

            // Показываем оригинальный файл
            setFileDisplayAudio(URL.createObjectURL(file));
            setFileAudio(file);

        } catch (error) {
            console.error('Error processing audio:', error);
            toast.error('Failed to process audio file');
            clearAudio();
        } finally {
            setTimeout(() => {
                setIsAudioProcessing(false);
                setAudioProcessingProgress(0);
                setAudioProcessingStage('');
                setConversionStats('');
            }, 1000);
        }
    };



    {/* PROGRESS BAR */}
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
    
        if (isPostClicked) {
            interval = setInterval(() => {
                setTrackProgress(prevProgress => {
                    if (prevProgress < 100) {
                        return prevProgress + 10; // Increase by 10% (you can adjust the value based on actual upload speed)
                    } else {
                        clearInterval(interval!);
                        setIsPostClicked(false); // Reset isPostClicked to false after upload is complete
                        return 100;
                    }
                });
            }, 1000); // Simulate upload every second
        }
    
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [isPostClicked]);


    {/* IMAGE */}
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    
    // Обработка изображения через useCallback
    const handleImageChange = useCallback(async (file: File) => {
        try {
            setIsProcessingImage(true);
            setImageUploadStage('Processing image...');
            setImageUploadProgress(0);

            const optimizedImage = await optimizeImage(file, (stats) => {
                setImageUploadProgress(stats.progress);
                setImageUploadStage(stats.stage);
            });

            setSelectedImage(new File([optimizedImage], file.name, { type: file.type }));
            setImagePreview(URL.createObjectURL(optimizedImage));
            setFileImage(new File([optimizedImage], file.name, { type: file.type }));
            setFileDisplayImage(URL.createObjectURL(optimizedImage));
            setImageUploaded(true);

        } catch (error) {
            console.error('Error processing image:', error);
            setSelectedImage(file);
            setImagePreview(URL.createObjectURL(file));
            setFileImage(file);
            setFileDisplayImage(URL.createObjectURL(file));
        } finally {
            setIsProcessingImage(false);
            setImageUploadProgress(0);
            setImageUploadStage('');
        }
    }, []);

    // Обработчик выбора файла
    const onImageSelect = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            await handleImageChange(file);
        }
    }, [handleImageChange]);

    // Обработчик drag and drop
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            await handleImageChange(file);
        }
    }, [handleImageChange]);

    const discard = () => {
        setFileDisplayImage('')
        setFileImage(null)
    }

    const clearAudio = () => {
        if (audioElement) {
            audioElement.pause();
            setAudioElement(null);
    }
        setIsAudioPlaying(false);
        setFileAudio(null);
        setFileDisplayAudio('');
    };

    const clearImage = () => {
        setFileDisplayImage('');
      };


    {/* POPUP */}

        const [showPopup, setShowPopup] = useState(false);
    
        const handleOpenPopup = () => {
            setShowPopup(true);
        };
    
        const handleClosePopup = () => {
            setShowPopup(false);
        };



    {/*VALIDATION*/}
// Валидация данных перед отправкой
    const validateFormData = (fileAudio: File | null, trackname: string, genre: string): UploadError | null => {
        if (!fileAudio) {
            return { type: 'file', message: 'Необходимо выбрать аудиофайл.' };
        }
        if (!trackname || trackname.trim() === '') {
            return { type: 'trackname', message: 'Необходимо ввести название трека.' };
        }
        if (!genre || genre.trim() === 'Genres') {
            return { type: 'genre', message: 'Необходимо выбрать жанр.' };
        }
        return null;
    };

    
 {/* Создание нового поста */}
 const [isRedirecting, setIsRedirecting] = useState(false);

 const createNewPost = async () => {
    // Проверяем наличие пользователя
    if (!contextUser?.user) {
        toast.error('User not found');
        return;
    }

    // Проверяем наличие обработанных файлов
    if (!processedFiles.mp3Blob || !processedFiles.segments.length || !processedFiles.m3u8File) {
        toast.error('Please wait for file processing to complete');
        return;
    }

    // Проверяем наличие обязательных файлов и данных
    if (!fileAudio || !imageFile || !genre || genre === 'Genres') {
        toast.error('Please select both audio and image files, and choose a genre');
        return;
    }

    try {
        setIsReleasing(true);
        setUploadProgress(0);
        setUploadStage('Preparing files...');
        
        const startTime = Date.now();

        // Создаем файлы из блобов
        const mp3File = new File([processedFiles.mp3Blob], 'track.mp3', { type: 'audio/mpeg' });
        const segmentFiles = processedFiles.segments.map((blob, index) => 
            new File([blob], `segment-${index}.mp3`, { type: 'audio/mpeg' })
        );
        const m3u8File = new File([processedFiles.m3u8File], 'playlist.m3u8', { 
            type: 'application/x-mpegURL' 
        });

        // Вычисляем общий размер всех файлов
        const totalSize = fileAudio.size + imageFile.size + mp3File.size + 
            segmentFiles.reduce((acc, file) => acc + file.size, 0) + m3u8File.size;

        // Создаем функцию для обновления прогресса
        const updateProgress = (uploadedSize: number, stage: string) => {
            const progress = (uploadedSize / totalSize) * 100;
            setUploadProgress(progress);
            setUploadStage(stage);

            // Вычисляем оставшееся время
            const elapsedTime = Date.now() - startTime;
            const uploadSpeed = uploadedSize / elapsedTime; // bytes per millisecond
            const remainingSize = totalSize - uploadedSize;
            const estimatedTimeLeft = remainingSize / uploadSpeed / 1000; // seconds
            setEstimatedTimeLeft(Math.round(estimatedTimeLeft));
        };

        const result = await useCreatePost(
            fileAudio,
            imageFile,
            contextUser.user.id,
            trackname,
            mp3File,
            genre,
            segmentFiles,
            m3u8File,
            (progress, stage, estimatedTime) => {
                setUploadProgress(progress);
                setUploadStage(stage);
                setEstimatedTimeLeft(estimatedTime || '');
            }
        );

        if (result) {
            setIsRedirecting(true); // Показываем оверлей
            toast.success('Track uploaded successfully!');
            
            // Задержка перед редиректом
        setTimeout(() => {
                router.push(`/profile/${contextUser.user.id}`);
            }, 3000);
            }

    } catch (error) {
        console.error('Error creating post:', error);
        toast.error(
            error instanceof Error ? error.message : 'Error creating post',
            { duration: 5000 }
        );
    } finally {
        setIsReleasing(false);
        setUploadProgress(0);
        setUploadStage('');
        setEstimatedTimeLeft(null);
    }
};

    const handlePlayPause = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!fileAudio) return;

        if (!audioElement) {
            const audio = new Audio(URL.createObjectURL(fileAudio));
            setAudioElement(audio);
            audio.play();
            setIsAudioPlaying(true);
        } else {
            if (isAudioPlaying) {
                audioElement.pause();
            } else {
                audioElement.play();
            }
            setIsAudioPlaying(!isAudioPlaying);
        }
    };

    const disableUpload = (): boolean => {
        // Проверяем все условия, которые должны блокировать загрузку
        if (isAudioProcessing || isImageUploading) {
            toast.error('Please wait for file processing to complete');
            return true;
        }

        if (!fileAudio || !imageFile || !trackname || !genre) {
            return true;
        }

        if (isUploading || isPostClicked) {
            return true;
        }

        return false;
    };

    // Обновим функцию handleRelease
    const handleRelease = async () => {
        if (disableUpload()) return;

        try {
            setIsPostClicked(true);
            setIsUploading(true);
            setUploadStage('Preparing files for upload...');
            setTrackProgress(0);

            if (!contextUser?.user?.id || !fileAudio || !imageFile || !Mp3File || !processedFiles) {
                throw new Error('Missing required files or user data');
            }

            // Функция для обновления прогресса
            const updateUploadProgress = (uploadedSize: number, stage: string) => {
                const totalSize = fileAudio.size + 
                                imageFile.size + 
                                Mp3File.size + 
                                processedFiles.segments.reduce((acc, seg) => acc + seg.size, 0) +
                                (processedFiles.m3u8File?.size || 0);
                
                const progress = Math.round((uploadedSize / totalSize) * 100);
                setTrackProgress(progress);
                setUploadStage(stage);
            };

            // Загружаем все файлы
            await useCreatePost(
                fileAudio,
                imageFile,
                contextUser.user.id,
                trackname,
                Mp3File,
                genre,
                processedFiles.segments,
                processedFiles.m3u8File as File,
                updateUploadProgress
            );

            setTrackProgress(100);
            setUploadStage('Upload complete!');
            toast.success('Track uploaded successfully!');
            
            setTimeout(() => {
                router.push(`/profile/${contextUser.user?.id}`);
            }, 1000);

        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload track');
            setTrackProgress(0);
            setUploadStage('');
        } finally {
            setIsPostClicked(false);
            setIsUploading(false);
        }
    };

    // Добавляем состояния для прогресса загрузки изображения
    const [imageUploadProgress, setImageUploadProgress] = useState(0);
    const [imageUploadStage, setImageUploadStage] = useState('');

    // Добавим функцию для получения списка недостающих требований
    const getMissingRequirements = () => {
        const requirements = [];
        if (!fileAudio) requirements.push('Upload audio track');
        if (!imageFile) requirements.push('Upload cover image');
        if (!trackname) requirements.push('Enter track name');
        if (!genre || genre === 'Genres') requirements.push('Select genre');
        return requirements;
    };

    return (
        <div className="relative">
                <UploadLayout>
                {/* {isModalOpen && <UploadModal onClose={closeModal} />} */}

                    <div className="flex flex-col items-center justify-center h-screen w-full rounded-md py-6 md:px-10 px-4">
                   

                    <div style={{ position: 'absolute', height: '10px', width: '100%', bottom: 0, left: 0, zIndex: 80 }}>
                        <ProgressBar progress={trackProgress} />
                    </div>


                
                       

                    {/* Upload track */}

                    <h2 className="text-[13px] mt-10 mb-4 ">Artist name: {contextUser?.user?.name || 'Unknown Artist'}</h2>
                    

                        {/* TRACK NAME */}
                        <div className="flex items-center align-center">
                            <div className="w-[450px]">
                        <input 
                            maxLength={150}
                            type="text"
                            className="
                                bg-[#2A184B]
                                w-full
                                p-4
                                rounded-2xl
                                focus:outline-none
                                hover:bg-[#1f1239] 
                                transition-colors
                            "
                            placeholder="Type a track name" 
                            value={trackname}
                            onChange={event => setTrackname(event.target.value)}
                            style={{ fontSize: '15px', color: '#ffff' }}
                        />
                    </div>
                        </div>

                  {/* UPLOAD AUDIO */}
                  <div className="mt-5 w-[450px] h-[450px] mx-auto bg-[#2A184B] rounded-2xl relative overflow-hidden
                        sm:w-[450px] sm:h-[450px]
                        xs:w-[350px] xs:h-[350px]
                        md:w-[450px] md:h-[450px]">
                        {isReleasing ? (
                            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                                <div className="bg-[#2A184B] p-6 rounded-2xl w-[450px]">
                                    <div className="mb-4">
                                        <div className="text-white text-[15px] mb-2">{uploadStage}</div>
                                        <div className="w-full bg-[#1f1239] rounded-full h-2">
                                            <div 
                                                className="bg-[#20DDBB] h-full rounded-full transition-all duration-300"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-[13px] text-[#838383]">
                                        <div>{Math.round(uploadProgress)}%</div>
                                        {estimatedTimeLeft !== null && (
                                            <div>
                                                {estimatedTimeLeft > 60 
                                                    ? `${Math.round(estimatedTimeLeft / 60)} minutes left`
                                                    : `${Math.round(estimatedTimeLeft)} seconds left`
                                                }
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : fileAudio ? (
                            <div className="w-full h-full relative">
                                {/* Background image or pattern */}
                                <div className="absolute inset-0 bg-[#2A184B] flex items-center justify-center">
                                    <BiSolidCloudUpload size="64" color="#ffffff" opacity="0.2" />
                                </div>
                                
                                {/* Audio controls and info at bottom */}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm p-4">
                                    {/* White line for audio wave representation */}
                                    <div className="w-full h-[2px] bg-white mb-3"></div>
                                    
                                    {/* Track info and controls */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center flex-1 mr-4">
                                            <button
                                                onClick={handlePlayPause}
                                                className="mr-3 hover:opacity-80 transition-opacity"
                                            >
                                                {isAudioPlaying ? (
                                                    <BsFillPauseFill size={24} color="white" />
                                                ) : (
                                                    <BsFillPlayFill size={24} color="white" />
                                                )}
                                            </button>
                                            <span className="text-white text-sm truncate">
                                                {fileAudio.name}
                                            </span>
                    </div>
                    <button 
                        onClick={() => clearAudio()} 
                                            className="text-white hover:opacity-80 transition-opacity"
                    >
                                            <AiOutlineClose size={20} />
                    </button>
                                    </div>
                </div>
            </div>
        ) : (
            <label 
                htmlFor="fileInput"
                                className="w-full h-full flex flex-col items-center justify-center cursor-pointer
                                         hover:bg-[#1f1239] transition-colors duration-300"
                            >
                                <BiSolidCloudUpload size="48" color="#ffffff" />
                                <p className="mt-4 text-white text-[15px]">Select audio to upload</p>
                                <p className="mt-2 text-gray-300 text-[13px]">Or drag and drop a file</p>
                                <p className="mt-4 text-gray-400 text-sm">WAV up to 12 minutes</p>
                <input 
                    type="file" 
                    id="fileInput"
                    onChange={onChangeAudio}
                    hidden 
                    accept=".wav" 
                />
            </label>
        )}
    </div>

                        {error && <p className="text-red-500">{error.message}</p>}

                       

                    {/* POPUP ----------------------- */}
                    
                        {showPopup && (
                        <div id="popupOverlay" className="top-0 bottom-0 popup-overlay absolute bg-[linear-gradient(60deg,#2E2469,#351E43)] z-10 w-full h-full flex-col justify-center items-center">
                            <div className="popup-content">
                            <div className="flex flex-col items-center justify-center h-full w-full  rounded-md py-6 md:px-10 px-5">
                            <div className="mt-1 mb-4">
                    <div className="flex flex-col items-center ">

            
                    <div className="w-[450px] h-[450px] mx-auto bg-[#2A184B] mt-24 rounded-2xl relative overflow-hidden">
                        {isImageUploading ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <BiLoaderCircle className="animate-spin" color="#ffffff" size={30} />
                            </div>
                        ) : fileDisplayImage ? (
                            <div className="w-full h-full relative">
                                {/* Background image */}
                                <img 
                                    className="absolute inset-0 w-full h-full object-cover"
                                    src={fileDisplayImage}
                                    alt="Selected Image"
                                />
                                
                                {/* Image info and controls at bottom */}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm p-4">
                                    {/* White line for visual separation */}
                                    <div className="w-full h-[2px] bg-white mb-3"></div>
                                    
                                    {/* Image info and controls */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center flex-1 mr-4">
                                            <AiOutlineCheckCircle size="20" color="white" className="mr-3"/>
                                            <span className="text-white text-sm truncate">
                                                {imageFile?.name || 'Selected image'}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={clearImage} 
                                            className="text-white hover:opacity-80 transition-opacity"
                                        >
                                            <AiOutlineClose size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <label
                                htmlFor="fileInputImage"
                                className="w-full h-full flex flex-col items-center justify-center cursor-pointer
                                         hover:bg-[#1f1239] transition-colors duration-300"
                            >
                                <BiSolidCloudUpload size="48" color="#ffffff" />
                                <p className="mt-4 text-white text-[15px]">Select image to upload</p>
                                <p className="mt-2 text-gray-300 text-[13px]">Or drag and drop a file</p>
                                <p className="mt-4 text-gray-400 text-sm">JPEG, PNG</p>
                                <p className="mt-2 text-gray-400 text-[13px]">Up to 5 MB</p>
                                <input 
                                    type="file" 
                                    id="fileInputImage"
                                    onChange={onImageSelect}
                                    hidden 
                                    accept=".jpg, .jpeg, .png" 
                                />
                            </label>
                        )}
                    </div>

                {/* Terms text and buttons */}
                <div className="w-[450px] mt-8">
                    <p className="text-[13px] text-[#838383] mb-4 text-center">
                        By clicking the "release" button you automatically agree with the 
                        <Link href="/terms" className="text-[#018CFD] hover:underline"> Sacral Track Terms of use</Link>
                    </p>

                    {/* Buttons container */}
                    <div className="flex justify-between items-center gap-4">
                        <button 
                            onClick={handleClosePopup}
                            className="w-1/2 bg-[#2A184B] text-white py-3 px-6 rounded-2xl 
                                     hover:bg-[#1f1239] transition-colors duration-300 text-[15px]"
                        >
                            Back
                        </button>

                        <div className="relative w-1/2">
                        <button 
                                onClick={handleRelease}
                                disabled={disableUpload()}
                                className={`w-full py-3 px-6 rounded-2xl text-[15px] transition-colors duration-300
                                    group relative
                                    ${disableUpload() 
                                        ? 'bg-gray-600 cursor-not-allowed text-gray-400' 
                                        : 'bg-[#20DDBB] hover:bg-[#1ca88f] text-black'
                                    }`}
                            >
                                {isUploading ? (
                                <div className="flex items-center justify-center">
                                        <BiLoaderCircle className="animate-spin mr-2" />
                                        Uploading...
                                </div>
                            ) : (
                                'Release'
                            )}

                                {/* Тултип с требованиями */}
                                {disableUpload() && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max
                                                  opacity-0 invisible group-hover:opacity-100 group-hover:visible
                                                  transition-all duration-200">
                                        <div className="bg-[#2A184B] text-white text-sm py-2 px-4 rounded-lg shadow-lg">
                                            <p className="font-medium mb-1">To release your track:</p>
                                            <ul className="list-disc list-inside">
                                                {getMissingRequirements().map((req, index) => (
                                                    <li key={index} className="text-gray-300">{req}</li>
                                                ))}
                                            </ul>
                                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 
                                                          rotate-45 w-2 h-2 bg-[#2A184B]" />
                                        </div>
                                    </div>
                            )}
                        </button>
                        </div>
                    </div>
                </div>

            </div>
            </div>
            </div>
            </div>

         </div>
        )}
        {/* CHOOSE GENRE ----------------------- */}


        {/* Buttons container */}
        <div className="flex items-center gap-4 w-[450px] mt-5">
            {/* Genre Dropdown */}
            <div className="relative flex-1">
                <button 
                    type="button"
                    onClick={() => setIsGenreDropdownOpen(!isGenreDropdownOpen)}
                    className="bg-[#2A184B] text-[14px] p-4 pl-12 rounded-2xl h-[52px] w-full hover:bg-[#1f1239] transition-colors text-white flex items-center justify-between"
                >
                    <span>{genre || 'Select genre'}</span>
                    <svg 
                        className={`w-4 h-4 transition-transform ${isGenreDropdownOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {/* Genre Icon */}
                <img 
                    src="images/ico-genre.svg" 
                    alt="Genre" 
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6"
                />

                {/* Dropdown Menu */}
                {isGenreDropdownOpen && (
                    <div 
                        className="absolute bottom-[60px] left-0 w-full bg-[#371f66] rounded-2xl py-2 shadow-lg max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#2A184B] scrollbar-track-transparent"
                        style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: '#2A184B transparent',
                            transform: 'translateY(0)',
                            zIndex: 1000,
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                        }}
                    >
                        {genres.slice().reverse().map((genreOption) => (
                            <button
                                key={genreOption}
                                onClick={() => handleGenreSelect(genreOption)}
                                className={`w-full px-4 py-3 text-left text-[14px] transition-colors
                                    ${genre === genreOption 
                                        ? 'bg-[#2A184B] text-white' 
                                        : 'text-gray-300 hover:bg-[#2A184B]'}`}
                            >
                                {genreOption}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button 
                className="bg-[#2A184B] text-[14px] py-4 px-8 rounded-2xl h-[52px] flex-1 hover:bg-[#1f1239] transition-colors text-white" 
                onClick={handleOpenPopup}
            >
                Next
            </button>
        </div>

  
          </div>   
</UploadLayout>

{isReleasing && (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-[#2A184B] p-6 rounded-2xl w-[450px]">
            <div className="mb-4">
                <div className="text-white text-[15px] mb-2">{uploadStage}</div>
                <div className="w-full bg-[#1f1239] rounded-full h-2">
                    <div 
                        className="bg-[#20DDBB] h-full rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                    />
                </div>
            </div>
            <div className="flex justify-between text-[13px] text-[#838383]">
                <div>{Math.round(uploadProgress)}%</div>
                {estimatedTimeLeft !== null && (
                    <div>
                        {estimatedTimeLeft > 60 
                            ? `${Math.round(estimatedTimeLeft / 60)} minutes left`
                            : `${Math.round(estimatedTimeLeft)} seconds left`
                        }
                    </div>
                )}
            </div>
        </div>
    </div>
)}

{isAudioProcessing && (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-[#2A184B] p-6 rounded-2xl w-[450px]">
            <div className="mb-4">
                <div className="text-white text-[15px] mb-2">{audioProcessingStage}</div>
                <div className="text-[13px] text-[#838383] mb-2">{conversionStats}</div>
                <div className="w-full bg-[#1f1239] rounded-full h-2">
                    <div 
                        className="bg-[#20DDBB] h-full rounded-full transition-all duration-300"
                        style={{ width: `${audioProcessingProgress}%` }}
                    />
                </div>
            </div>
            <div className="flex justify-between text-[13px] text-[#838383]">
                <div>{Math.round(audioProcessingProgress)}%</div>
                <div>Processing audio...</div>
            </div>
        </div>
    </div>
)}

<div className="fixed bottom-0 left-0 w-full">
    {(isUploading || trackProgress > 0) && (
        <div className="bg-[#1A1A1A] p-4">
            <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                    <span>{uploadStage}</span>
                    <span>{trackProgress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-[#20DDBB] transition-all duration-300"
                        style={{ width: `${trackProgress}%` }}
                    />
                </div>
            </div>
        </div>
    )}
</div>

{/* Оверлей с сообщением о редиректе */}
{isRedirecting && (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
        <div className="bg-[#1f1239] p-8 rounded-lg text-center max-w-md">
            <BiLoaderCircle className="animate-spin text-white text-4xl mx-auto mb-4" />
            <h2 className="text-white text-xl mb-2">Upload Complete!</h2>
            <p className="text-gray-300">
                Please wait while you are being redirected to your profile to listen to your track...
            </p>
        </div>
    </div>
)}

{/* Прогресс загрузки изображения */}
{(isProcessingImage || imageUploadProgress > 0) && (
    <div className="fixed bottom-0 left-0 w-full z-50">
        <UploadProgress 
            stage={imageUploadStage} 
            progress={imageUploadProgress} 
        />
    </div>
)}
</div>
);
}

