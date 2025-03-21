import React from 'react';
import { motion } from 'framer-motion';

interface ImageUploaderProps {
    fileImage: File | null;
    imagePreview: string | null;
    handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    clearImage: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
    fileImage,
    imagePreview,
    handleImageChange,
    clearImage
}) => {
    return (
        <>
            {imagePreview ? (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full aspect-square rounded-2xl overflow-hidden relative border border-white/5 shadow-lg group"
                >
                    {/* Image preview */}
                    <img 
                        src={imagePreview} 
                        alt="Cover" 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300
                                  flex flex-col items-center justify-end p-6">
                        <p className="text-white mb-4 text-center">Cover image for your track</p>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={clearImage}
                            className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl text-white hover:bg-white/20 transition-colors"
                        >
                            Change image
                        </motion.button>
                    </div>
                    
                    {/* Remove button */}
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={clearImage}
                        className="absolute top-3 right-3 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white/80 
                                 hover:bg-black/70 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </motion.button>
                </motion.div>
            ) : (
                <motion.label 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full aspect-square rounded-2xl 
                                bg-gradient-to-br from-[#2A184B] to-[#1f1239]
                                border border-white/5 shadow-lg
                                flex flex-col items-center justify-center
                                cursor-pointer transition-all duration-300
                                hover:bg-white/5 relative overflow-hidden group"
                >
                    <input
                        type="file"
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                    />
                    
                    {/* Animated background elements */}
                    <div className="absolute inset-0 opacity-20">
                        <motion.div 
                            className="absolute h-40 w-40 rounded-full bg-gradient-to-r from-[#20DDBB]/40 to-transparent blur-xl"
                            animate={{ 
                                x: ['-50%', '150%'],
                                y: ['-50%', '150%'],
                            }} 
                            transition={{ 
                                duration: 15,
                                repeat: Infinity,
                                repeatType: 'reverse'
                            }}
                        />
                        <motion.div 
                            className="absolute h-40 w-40 rounded-full bg-gradient-to-r from-transparent to-[#018CFD]/40 blur-xl"
                            animate={{ 
                                x: ['150%', '-50%'],
                                y: ['150%', '-50%'],
                            }} 
                            transition={{ 
                                duration: 15,
                                repeat: Infinity,
                                repeatType: 'reverse'
                            }}
                        />
                    </div>
                    
                    {/* Icon and text */}
                    <div className="text-center p-6 z-10">
                        <motion.div 
                            className="w-16 h-16 rounded-full bg-white/5 
                                    flex items-center justify-center mx-auto mb-4"
                            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                        >
                            <svg className="w-8 h-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </motion.div>
                        <p className="text-white/60 text-sm mb-2">Click to upload cover image</p>
                        <p className="text-white/40 text-xs">JPG, PNG or GIF, up to 5MB</p>
                    </div>
                    
                    {/* Shimmer effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer opacity-0 group-hover:opacity-100" />
                </motion.label>
            )}
        </>
    );
};

export default ImageUploader; 