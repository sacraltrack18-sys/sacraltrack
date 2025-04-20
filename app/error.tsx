'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Логирование ошибки для отладки
    console.error('Произошла ошибка:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h2 className="text-3xl font-bold mb-4">Что-то пошло не так</h2>
      <p className="mb-6">Произошла ошибка при загрузке страницы</p>
      <button
        onClick={reset}
        className="px-6 py-2 rounded-full bg-purple-600 hover:bg-purple-700 transition-colors"
      >
        Попробовать снова
      </button>
    </div>
  )
} 