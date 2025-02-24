import { useMemo } from 'react';

const useCreateDownloadUrl = (fileId: string) => {
    const url = process.env.NEXT_PUBLIC_APPWRITE_URL; // Основной URL сервиса Appwrite
    const bucketId = process.env.NEXT_PUBLIC_BUCKET_ID; // ID бакета, который хранит файлы
    const project = process.env.NEXT_PUBLIC_PROJECT_ID; // ID проекта, для которого будет выполняться запрос

    // Проверка на наличие необходимых параметров
    if (!url || !bucketId || !project || !fileId) return '';

    // Генерация URL для скачивания файла
    return `${url}/storage/buckets/${bucketId}/files/${fileId}/download?project=${project}`;
}

export default useCreateDownloadUrl;
