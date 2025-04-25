'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function SharedArrayBufferError() {
  // Функция для ручного обновления страницы
  const handleReload = () => {
    window.location.reload();
  };

  // Функция для перехода только на страницу загрузки
  const handleRedirectToUpload = () => {
    window.location.href = '/upload';
  };

  return (
    <motion.div 
      className="max-w-2xl mx-auto p-6 bg-gradient-to-br from-[#2A184B] to-[#1f1239] rounded-xl shadow-lg border border-[#20DDBB]/10 mt-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-start">
        <div className="mr-4 text-3xl">⚠️</div>
        <div>
          <h3 className="text-xl font-bold text-[#20DDBB] mb-3">SharedArrayBuffer не доступен</h3>
          
          <p className="text-white/80 mb-4">
            Для обработки аудио требуется поддержка технологии SharedArrayBuffer, которая не активирована в вашем браузере. 
            Это технологическое ограничение связано с защитой от уязвимостей безопасности Spectre.
          </p>
          
          <div className="bg-[#1a0f2e] p-4 rounded-lg mb-4">
            <h4 className="text-white font-semibold mb-2">Возможные причины проблемы:</h4>
            <ul className="list-disc list-inside text-white/70 space-y-1">
              <li>Страница не загружена по HTTPS</li>
              <li>Вы используете режим инкогнито</li>
              <li>Вы используете устаревший браузер</li>
              <li>Необходимые заголовки безопасности не были применены</li>
              <li>Вы пытаетесь использовать обработку аудио не на странице загрузки</li>
            </ul>
          </div>
          
          <div className="bg-[#1a0f2e] p-4 rounded-lg mb-4">
            <h4 className="text-white font-semibold mb-2">Как исправить:</h4>
            <ul className="list-decimal list-inside text-white/70 space-y-2">
              <li>Убедитесь, что вы используете современный браузер (Chrome, Firefox, Edge)</li>
              <li>Выйдите из режима инкогнито, если он используется</li>
              <li>Попробуйте обновить страницу</li>
              <li>Попробуйте очистить кэш и cookies</li>
              <li>Перейдите непосредственно на страницу загрузки</li>
              <li>Если проблема не решается, обратитесь в службу поддержки</li>
            </ul>
          </div>
          
          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={handleRedirectToUpload}
              className="bg-[#1a0f2e] text-white font-medium py-2 px-4 rounded-lg hover:bg-[#2a184b] transition-colors"
            >
              Перейти на страницу загрузки
            </button>
            <button
              onClick={handleReload}
              className="bg-gradient-to-r from-[#20DDBB] to-[#018CFD] text-white font-medium py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
            >
              Обновить страницу
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 