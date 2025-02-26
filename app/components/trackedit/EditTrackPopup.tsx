import React, { useState } from 'react';
import useUpdatePost from "@/app/hooks/useUpdatePost";
import { convertWavToMp3, optimizeImage, createM3U8File, segmentAudio } from '@/app/utils/streaming';
import { useUser } from "@/app/context/user";
import toast from 'react-hot-toast';
import { BiSolidCloudUpload } from "react-icons/bi";
import { AiOutlineClose } from "react-icons/ai";
import { BsFillPauseFill, BsFillPlayFill } from "react-icons/bs";
import { ProcessingStats } from '@/app/types';

interface Post {
    id: string;
    audioUrl: string;
    imageUrl: string;
    trackname: string;
    updated_at: string;
    created_at: string;
    m3u8_url: string;
}

interface PostWithProfile extends Post {
    profile: {
        user_id: string;
        name: string;
        image: string;
    };
}

interface EditTrackPopupProps {
    postData: PostWithProfile;
    onUpdate: (data: PostWithProfile | null) => void;
    onClose: () => void;
}

const EditTrackPopup: React.FC<EditTrackPopupProps> = ({ postData, onUpdate, onClose }) => {
    const contextUser = useUser();
    const [trackname, setTrackname] = useState<string>(postData.trackname);
    const [fileAudio, setAudioFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState(postData.imageUrl);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [fileDisplayImage, setFileDisplayImage] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [processingStats, setProcessingStats] = useState<ProcessingStats>({
        stage: '',
        progress: 0,
        details: ''
    });
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFinalUpdate = async () => {
        if (!contextUser?.user) return;
        
        setIsProcessing(true);
        try {
            let optimizedImage = imageFile;
            if (imageFile) {
                const optimizedBlob = await optimizeImage(imageFile, (stats) => {
                    setProcessingStats({
                        stage: stats.stage,
                        progress: stats.progress,
                        details: stats.details || ''
                    });
                });
                optimizedImage = new File([optimizedBlob], imageFile.name, {
                    type: imageFile.type,
                    lastModified: imageFile.lastModified
                });
            }

            let m3u8Url = postData.m3u8_url;
            let mp3File = null;

            if (fileAudio) {
                setProcessingStats({
                    stage: 'Converting WAV to MP3',
                    progress: 20,
                    details: 'Processing audio file...'
                });

                const mp3Result = await convertWavToMp3(fileAudio, (progress) => {
                    const progressValue = Number(progress);
                    setProcessingStats({
                        stage: 'Converting WAV to MP3',
                        progress: 20 + progressValue * 0.2,
                        details: `Converting: ${Math.round(progressValue)}%`
                    });
                });

                mp3File = new File([mp3Result], 'track.mp3', { type: 'audio/mp3' });

                const segments = await segmentAudio(mp3File, (progress) => {
                    const progressValue = Number(progress);
                    setProcessingStats({
                        stage: 'Creating segments',
                        progress: 40 + progressValue * 0.4,
                        details: `Segmenting: ${Math.round(progressValue)}%`
                    });
                });

                const m3u8Data = await createM3U8File(segments as any);

                m3u8Url = URL.createObjectURL(new Blob([m3u8Data]));
            }

            await useUpdatePost(
                postData.id,
                contextUser.user.id,
                trackname,
                fileAudio,
                mp3File,
                optimizedImage,
                m3u8Url,
                setProcessingStats
            );

            onUpdate(null);
            toast.success('Track updated successfully!');
        } catch (error) {
            console.error("Error updating track:", error);
            toast.error('Failed to update track');
        } finally {
            setIsProcessing(false);
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

    const handlePlayPause = () => {
        setIsPlaying(!isPlaying);
    };
      
    const clearAudio = () => {
        setAudioFile(null);
        setIsPlaying(false);
    };

    return (
        <div className="fixed z-[990] top-0 left-0 right-0 bottom-0 bg-[#15191F] bg-opacity-80 backdrop-blur-lg">
            <div className="bg-[#15161A] max-w-5xl mx-auto mt-10 p-6 rounded-2xl">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-white">Edit Track</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <AiOutlineClose size={24} />
                    </button>
                </div>

                {/* Main Content - Two Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column - Media Upload */}
                    <div className="space-y-6">
                        {/* Artwork Upload */}
                        <div className="bg-[#1E2136] rounded-2xl p-4">
                            <h3 className="text-lg font-semibold mb-4">Artwork</h3>
                            <div className="border-2 border-dashed border-gray-600 rounded-xl p-4 text-center">
                        {!fileDisplayImage ? (
                                    <label className="cursor-pointer block">
                                        <BiSolidCloudUpload size={48} className="mx-auto mb-4 text-gray-400" />
                                        <p className="text-sm text-gray-300">Click or drag image to upload</p>
                                        <p className="text-xs text-gray-500 mt-2">JPEG or PNG, up to 5MB</p>
                                <input 
                                    type="file" 
                                    onChange={onChangeImage}
                                    hidden 
                                            accept=".jpg,.jpeg,.png"
                                />
                            </label>
                        ) : (
                                    <div className="relative aspect-square">
                                        <img
                                            src={fileDisplayImage}
                                            alt="Preview"
                                            className="rounded-lg object-cover w-full h-full"
                                        />
                                        <button
                                            onClick={clearImage}
                                            className="absolute top-2 right-2 bg-black/50 p-2 rounded-full"
                                        >
                                            <AiOutlineClose size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                                </div>
                                
                        {/* Audio Upload */}
                        <div className="bg-[#1E2136] rounded-2xl p-4">
                            <h3 className="text-lg font-semibold mb-4">Audio</h3>
                            <div className="border-2 border-dashed border-gray-600 rounded-xl p-4">
                                {!fileAudio ? (
                                    <label className="cursor-pointer block text-center">
                                        <BiSolidCloudUpload size={48} className="mx-auto mb-4 text-gray-400" />
                                        <p className="text-sm text-gray-300">Click or drag audio to upload</p>
                                        <p className="text-xs text-gray-500 mt-2">WAV, up to 12 minutes</p>
                                        <input
                                            type="file"
                                            onChange={onChangeAudio}
                                            hidden
                                            accept=".wav"
                                        />
                                    </label>
                                ) : (
                                    <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <button onClick={handlePlayPause}>
                                                {isPlaying ? (
                                                        <BsFillPauseFill size={24} />
                                                ) : (
                                                        <BsFillPlayFill size={24} />
                                                )}
                                                </button>
                                                <span className="text-sm truncate">{fileAudio.name}</span>
                                            </div>
                                            <button onClick={clearAudio}>
                                                <AiOutlineClose size={20} />
                                            </button>
                                        </div>
                                        <div className="h-1 bg-gray-600 rounded-full">
                                            <div className="h-full bg-[#20DDBB] rounded-full" style={{ width: '0%' }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Track Info */}
                    <div className="space-y-6">
                        <div className="bg-[#1E2136] rounded-2xl p-4">
                            <h3 className="text-lg font-semibold mb-4">Track Info</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-gray-400 mb-2 block">Track Name</label>
                                    <input
                                        type="text"
                                        value={trackname}
                                        onChange={(e) => setTrackname(e.target.value)}
                                        maxLength={30}
                                        className="w-full bg-[#2A184B] border-none rounded-xl p-3 text-white"
                                        placeholder="Enter track name"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Processing Status */}
                        {isProcessing && (
                            <div className="bg-[#1E2136] rounded-2xl p-4">
                                <h3 className="text-lg font-semibold mb-4">Processing</h3>
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-400">{processingStats.stage}</p>
                                    <div className="h-2 bg-gray-700 rounded-full">
                                        <div
                                            className="h-full bg-[#20DDBB] rounded-full transition-all duration-300"
                                            style={{ width: `${processingStats.progress}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500">{processingStats.details}</p>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-4 mt-8">
                            <button
                                onClick={onClose}
                                className="px-6 py-3 rounded-xl bg-gray-600 hover:bg-gray-700 text-white"
                            >
                                Cancel
                            </button>
                        <button
                            onClick={handleFinalUpdate}
                                disabled={isProcessing}
                                className="px-6 py-3 rounded-xl bg-[#20DDBB] hover:bg-[#1ca088] text-white font-medium"
                            >
                                {isProcessing ? 'Processing...' : 'Update Track'}
                        </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditTrackPopup;
