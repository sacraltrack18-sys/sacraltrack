import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h2 className="text-3xl font-bold mb-4">Страница не найдена</h2>
      <p className="mb-6">Запрашиваемая страница не существует</p>
      <Link 
        href="/"
        className="px-6 py-2 rounded-full bg-purple-600 hover:bg-purple-700 transition-colors"
      >
        Вернуться на главную
      </Link>
    </div>
  )
} 