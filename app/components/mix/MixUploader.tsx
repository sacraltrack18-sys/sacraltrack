'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowUpTrayIcon, MusicalNoteIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { useMixStore } from '../../stores/mixStore';
import { useUser } from '../../context/user';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface MixUploaderProps {
  onClose: () => void;
  onSuccess: () => void;
}

const genres = [
  'hip-hop',
  'electronic',
  'pop',
  'rock',
  'jazz',
  'r&b',
  'country',
  'folk',
  'classical',
  'reggae',
  'blues',
  'metal',
  'indie',
  'ambient',
  'funk',
  'soul',
  'disco',
  'house',
  'techno',
  'trap',
  'drill',
  'other'
];

export default function MixUploader({ onClose, onSuccess }: MixUploaderProps) {
  const { createMixPost, isCreatingMix } = useMixStore();
  const userContext = useUser();
  const user = userContext?.user;
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('hip-hop');
  const [tags, setTags] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Обработчик выбора аудиофайла
  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Проверяем тип файла
    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file');
      return;
    }
    
    // Проверяем размер файла (максимум 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Audio file size must be less than 50MB');
      return;
    }
    
    setAudioFile(file);
    
    // Создаем URL для предпросмотра аудио
    const previewUrl = URL.createObjectURL(file);
    setAudioPreviewUrl(previewUrl);
  };
  
  // Обработчик выбора изображения
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    // Проверяем размер файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file size must be less than 5MB');
      return;
    }
    
    setImageFile(file);
    
    // Создаем URL для предпросмотра изображения
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
  };
  
  // Обработчик отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You need to be logged in to create a mix');
      return;
    }
    
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    
    if (!audioFile) {
      toast.error('Audio file is required');
      return;
    }
    
    if (!imageFile) {
      toast.error('Cover image is required');
      return;
    }
    
    // Преобразуем теги из строки в массив
    const tagsArray = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    // Создаем объект микса
    const mixData = {
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      genre,
      tags: tagsArray
    };
    
    try {
      // Отправляем данные на сервер
      const mixId = await createMixPost(mixData, audioFile, imageFile);
      
      if (mixId) {
        toast.success('Mix created successfully');
        onSuccess();
      } else {
        toast.error('Failed to create mix');
      }
    } catch (error) {
      console.error('Error creating mix:', error);
      toast.error('Failed to create mix');
    }
  };
  
  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-bold">Create New Mix</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              disabled={isCreatingMix}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Заголовок */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter mix title"
                className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isCreatingMix}
                maxLength={100}
                required
              />
            </div>
            
            {/* Описание */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your mix"
                className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isCreatingMix}
                rows={3}
                maxLength={500}
              />
            </div>
            
            {/* Жанр */}
            <div>
              <label htmlFor="genre" className="block text-sm font-medium text-gray-700 mb-1">Genre *</label>
              <select
                id="genre"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isCreatingMix}
                required
              >
                {genres.map((g) => (
                  <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                ))}
              </select>
            </div>
            
            {/* Теги */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
              <input
                type="text"
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. summer, chill, party"
                className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isCreatingMix}
              />
            </div>
            
            {/* Загрузка аудиофайла */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Audio File *</label>
              <input
                type="file"
                ref={audioInputRef}
                onChange={handleAudioChange}
                accept="audio/*"
                className="hidden"
                disabled={isCreatingMix}
                required
              />
              
              {audioFile ? (
                <div className="border border-gray-300 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <MusicalNoteIcon className="h-6 w-6 text-primary mr-2" />
                      <div>
                        <p className="font-medium truncate max-w-xs">{audioFile.name}</p>
                        <p className="text-xs text-gray-500">{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setAudioFile(null);
                        setAudioPreviewUrl(null);
                      }}
                      className="text-gray-500 hover:text-red-500 transition-colors"
                      disabled={isCreatingMix}
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {audioPreviewUrl && (
                    <audio 
                      controls 
                      className="w-full mt-2" 
                      src={audioPreviewUrl}
                    />
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center hover:border-primary transition-colors"
                  disabled={isCreatingMix}
                >
                  <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="font-medium">Click to upload audio</p>
                  <p className="text-sm text-gray-500 mt-1">MP3, WAV, M4A (max. 50MB)</p>
                </button>
              )}
            </div>
            
            {/* Загрузка изображения */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image *</label>
              <input
                type="file"
                ref={imageInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
                disabled={isCreatingMix}
                required
              />
              
              {imageFile ? (
                <div className="border border-gray-300 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <PhotoIcon className="h-6 w-6 text-primary mr-2" />
                      <div>
                        <p className="font-medium truncate max-w-xs">{imageFile.name}</p>
                        <p className="text-xs text-gray-500">{(imageFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreviewUrl(null);
                      }}
                      className="text-gray-500 hover:text-red-500 transition-colors"
                      disabled={isCreatingMix}
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {imagePreviewUrl && (
                    <div className="relative aspect-video rounded-lg overflow-hidden">
                      <Image 
                        src={imagePreviewUrl} 
                        alt="Cover preview" 
                        fill 
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center hover:border-primary transition-colors"
                  disabled={isCreatingMix}
                >
                  <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="font-medium">Click to upload image</p>
                  <p className="text-sm text-gray-500 mt-1">JPG, PNG, GIF (max. 5MB)</p>
                </button>
              )}
            </div>
            
            {/* Кнопка отправки */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isCreatingMix || !title.trim() || !audioFile || !imageFile}
                className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingMix ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    <span>Creating Mix...</span>
                  </div>
                ) : (
                  'Create Mix'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}