// FFmpeg Node.js Shim для Next.js API-роутов
const path = require('path');
const fs = require('fs');

// Импортируем node-fetch если доступен для лучшей поддержки WebAssembly
let fetch;
try {
  // Для Node.js >= 18 используем глобальный fetch
  if (typeof global.fetch === 'function') {
    fetch = global.fetch;
    console.log('[FFmpeg Shim] Using global fetch');
  } else {
    // Для более старых версий используем node-fetch
    fetch = require('node-fetch');
    console.log('[FFmpeg Shim] Using node-fetch');
  }
} catch (e) {
  console.warn('[FFmpeg Shim] node-fetch not available, some WebAssembly features might not work properly');
}

// Эмулируем объекты браузера для FFmpeg WebAssembly
if (typeof global.self === 'undefined') {
  // Определяем 'self' как глобальный объект для совместимости
  global.self = global;
  
  // Добавляем fetch в глобальный контекст если доступен
  if (fetch && typeof global.fetch === 'undefined') {
    global.fetch = fetch;
  }
  
  // Другие необходимые объекты браузера
  if (typeof global.window === 'undefined') {
    global.window = global;
  }
  
  // Создаем заглушки для URL и Blob если они не существуют
  if (typeof global.Blob === 'undefined') {
    global.Blob = class Blob {
      constructor(parts, options) {
        this.parts = parts;
        this.options = options;
      }
    };
  }
  
  if (typeof global.URL === 'undefined') {
    global.URL = {
      createObjectURL: (blob) => {
        return 'mocked-url://' + Math.random().toString(36).substring(2);
      },
      revokeObjectURL: (url) => {}
    };
  }

  console.log('[FFmpeg Shim] Browser environment emulation set up for Node.js');
}

// Определяем пути к core файлам
const CORE_JS_PATH = path.resolve('./node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js');
const CORE_WASM_PATH = path.resolve('./node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm');

// Проверяем наличие файлов
if (!fs.existsSync(CORE_JS_PATH) || !fs.existsSync(CORE_WASM_PATH)) {
  console.error('FFmpeg core files not found. Please reinstall @ffmpeg/core package.');
}

// Чтение файлов
const coreJsContent = fs.readFileSync(CORE_JS_PATH, 'utf-8');
const coreWasmContent = fs.readFileSync(CORE_WASM_PATH);

// Настройка для корректной работы WebAssembly
// Это помогает FFmpeg найти необходимые файлы
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  process.env.FFMPEG_CORE_PATH = path.dirname(CORE_JS_PATH);
}

// Экспорт объекта с содержимым файлов
module.exports = {
  coreJs: coreJsContent,
  coreWasm: coreWasmContent,
  CORE_JS_PATH,
  CORE_WASM_PATH
}; 