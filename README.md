# Sacral Track - Music Platform

## Overview

Sacral Track is a comprehensive music platform designed to connect artists, music lovers, and creators in a vibrant musical community. The platform combines music sharing, social networking, and marketplace functionality to create a unique ecosystem for all things music-related.

## Key Features

### Music Streaming & Distribution

- **Release System**: Upload and distribute your music tracks to the marketplace
- **Music Player**: High-quality streaming player with advanced playback controls
- **Track Discovery**: Browse music by genres, trending tracks, and personalized recommendations
- **Artist Monetization**: Earn $1 per sale through our marketplace system

### Social & Community

- **Vibe System**: Share thoughts, photos, and updates with the music community
- **Friends Network**: Connect with other users, add friends, and build your network
- **Rating System**: Rate users and tracks with a 5-star rating system
- **Ranking System**: User ranking based on activity, followers, and content popularity
  - Ranks include: Legend, Master, Advanced, Experienced, and Beginner
  - Special ranks for top performers: Diamond, Platinum, Gold, Silver, and Bronze

### User Profiles

- **Customizable Profiles**: Personalize your profile with bio, avatar, banner images
- **Stats & Analytics**: Track your followers, likes, ratings, and overall performance
- **Music Showcase**: Feature your best tracks directly on your profile
- **Achievement System**: Earn badges and recognition based on your activities

### Communication

- **Chat System**: Direct messaging between users
- **Notifications**: Real-time notifications for interactions and updates
- **Comments & Feedback**: Engage with content through comments and feedback

## Technical Architecture

### Frontend

- **Framework**: Next.js with React
- **State Management**: Zustand for global state management
- **Animation**: Framer Motion for smooth, professional animations
- **UI Components**: Custom components with modern glass-morphism design
- **Responsive Design**: Full mobile and desktop support

### Backend

- **Database**: Appwrite as the backend service
- **Authentication**: Secure user authentication and authorization
- **Storage**: Cloud storage for media files (tracks, images)
- **API**: RESTful API endpoints for data retrieval and manipulation

### Key Components

#### Navigation & Layout

- **TopNav**: Main navigation bar with search, profile, and action buttons
- **MainLayout**: Primary layout structure for content pages
- **MobileNav**: Responsive navigation for mobile devices

#### Music-Related

- **Music Player**: Advanced audio player with playlist functionality
- **ReleaseButton**: Upload and publish new tracks
- **GenreSelector**: Browse music by different genres
- **TrackCard**: Display track information with interactive elements

#### Social Components

- **VibeButton/VibeUploader**: Share updates and posts with the community
- **UserCard**: Display user information with interactive elements
- **FriendsTab**: Manage and view friend connections
- **TopRankingUsers**: Showcase top users based on ranking algorithm

#### User Experience

- **SearchBar**: Global search functionality for tracks and users
- **NotificationBell**: Real-time notification system
- **ProfileMenu**: User account and profile management
- **TutorialGuide**: Interactive onboarding for new users

## User Roles & Permissions

- **Listeners**: Browse, follow artists, create playlists, rate content
- **Artists**: All listener abilities plus track uploading and monetization
- **Verified Artists**: Featured placement, enhanced analytics, advanced promotion tools

## Design Philosophy

Sacral Track employs a modern, sleek design focusing on:

- **Glass-morphism**: Translucent elements with blur effects
- **Gradient Aesthetics**: Rich color gradients for visual appeal
- **Microinteractions**: Subtle animations for enhanced user experience
- **Dark Theme**: Eye-friendly dark interface with accent colors
- **Consistent Branding**: Cohesive visual language across all components

## Getting Started

### For Users

1. Create your account
2. Complete your profile setup
3. Explore tracks or upload your own music
4. Connect with other users through the Vibe system
5. Rate content and become part of the ranking system

### For Developers

1. Clone the repository
2. Install dependencies with `npm install`
3. Set up environment variables for Appwrite connection
4. Run the development server with `npm run dev`
5. Access the application at `localhost:3000`

## Future Roadmap

- **Music NFTs**: Blockchain integration for exclusive content
- **Live Sessions**: Real-time audio streaming capabilities
- **Enhanced Analytics**: Advanced insights for artists
- **Mobile Apps**: Native applications for iOS and Android
- **Community Playlists**: Collaborative playlist creation
- **Events & Virtual Concerts**: Live music event integration

## Appwrite Connection Troubleshooting

### Testing Profile Creation

To validate that the profile creation and stats handling is working correctly, you can use the built-in testing utility:

1. Log in to your application
2. Open your browser's developer console (F12 or Cmd+Option+I)
3. Run the following commands:

```javascript
import { testProfileCreation } from '@/app/utils/testUtils';
testProfileCreation().then(console.log);
```

This will:
- Check your authentication status
- Look for an existing profile or create a new one
- Update the profile with test stats
- Report success or failure with details

### Diagnosing Connection Issues

You can temporarily add the AppwriteStatus component to any page to diagnose connection issues:

```jsx
import AppwriteStatus from '@/app/components/AppwriteStatus';

// Then in your component:
<AppwriteStatus />
```

This will display:
- Connection status to Appwrite
- Authentication status
- Collection existence checks
- Configuration details

### Common Issues & Solutions

#### Invalid document structure errors

If you see errors like `Invalid document structure: Attribute "total_likes" has invalid type`, make sure:
- All stats fields are stored as strings in Appwrite
- Your code converts numbers to strings before storing
- The type in Appwrite schema matches your data type

#### Failed to authenticate after multiple retries

This usually indicates:
- Network connectivity issues
- Expired sessions
- Invalid API keys
- Rate limiting

Try:
- Clearing your browser cache
- Logging out and back in
- Checking your internet connection
- Waiting a few minutes if you've made many requests

---

# Sacral Track - Музыкальная Платформа

## Обзор

Sacral Track — это комплексная музыкальная платформа, созданная для объединения артистов, любителей музыки и создателей в яркое музыкальное сообщество. Платформа сочетает в себе функции обмена музыкой, социальной сети и торговой площадки, создавая уникальную экосистему для всего, что связано с музыкой.

## Основные возможности

### Стриминг и дистрибуция музыки

- **Система релизов**: Загружайте и распространяйте свои музыкальные треки на маркетплейсе
- **Музыкальный плеер**: Высококачественный стриминговый плеер с расширенными элементами управления воспроизведением
- **Поиск треков**: Просматривайте музыку по жанрам, популярным трекам и персонализированным рекомендациям
- **Монетизация для артистов**: Зарабатывайте $1 за каждую продажу через нашу систему маркетплейса

### Социальные функции и сообщество

- **Система Vibe**: Делитесь мыслями, фотографиями и обновлениями с музыкальным сообществом
- **Сеть друзей**: Подключайтесь к другим пользователям, добавляйте друзей и расширяйте свою сеть
- **Система рейтинга**: Оценивайте пользователей и треки по 5-звездочной системе
- **Система ранжирования**: Ранжирование пользователей на основе активности, подписчиков и популярности контента
  - Ранги включают: Legend, Master, Advanced, Experienced и Beginner
  - Специальные ранги для лучших: Diamond, Platinum, Gold, Silver и Bronze

### Профили пользователей

- **Настраиваемые профили**: Персонализируйте свой профиль с биографией, аватаром, баннерами
- **Статистика и аналитика**: Отслеживайте своих подписчиков, лайки, рейтинги и общую производительность
- **Музыкальная витрина**: Размещайте свои лучшие треки прямо в профиле
- **Система достижений**: Получайте значки и признание на основе вашей активности

### Коммуникация

- **Система чата**: Прямой обмен сообщениями между пользователями
- **Уведомления**: Уведомления в реальном времени о взаимодействиях и обновлениях
- **Комментарии и отзывы**: Взаимодействуйте с контентом через комментарии и отзывы

## Техническая архитектура

### Frontend

- **Фреймворк**: Next.js с React
- **Управление состоянием**: Zustand для глобального управления состоянием
- **Анимация**: Framer Motion для плавных, профессиональных анимаций
- **UI-компоненты**: Пользовательские компоненты с современным стекломорфным дизайном
- **Адаптивный дизайн**: Полная поддержка мобильных устройств и компьютеров

### Backend

- **База данных**: Appwrite в качестве бэкенд-сервиса
- **Аутентификация**: Безопасная аутентификация и авторизация пользователей
- **Хранилище**: Облачное хранилище для медиафайлов (треки, изображения)
- **API**: Конечные точки RESTful API для получения и манипулирования данными

### Ключевые компоненты

#### Навигация и макет

- **TopNav**: Основная панель навигации с поиском, профилем и кнопками действий
- **MainLayout**: Основная структура макета для страниц контента
- **MobileNav**: Адаптивная навигация для мобильных устройств

#### Музыкальные компоненты

- **Music Player**: Продвинутый аудиоплеер с функциональностью плейлиста
- **ReleaseButton**: Загрузка и публикация новых треков
- **GenreSelector**: Просмотр музыки по разным жанрам
- **TrackCard**: Отображение информации о треке с интерактивными элементами

#### Социальные компоненты

- **VibeButton/VibeUploader**: Делитесь обновлениями и постами с сообществом
- **UserCard**: Отображение информации о пользователе с интерактивными элементами
- **FriendsTab**: Управление и просмотр друзей
- **TopRankingUsers**: Отображение лучших пользователей на основе алгоритма ранжирования

#### Пользовательский опыт

- **SearchBar**: Глобальная функциональность поиска треков и пользователей
- **NotificationBell**: Система уведомлений в реальном времени
- **ProfileMenu**: Управление учетной записью и профилем пользователя
- **TutorialGuide**: Интерактивное обучение для новых пользователей

## Роли и разрешения пользователей

- **Слушатели**: Просмотр, подписка на артистов, создание плейлистов, оценка контента
- **Артисты**: Все возможности слушателя плюс загрузка треков и монетизация
- **Проверенные артисты**: Размещение на видных местах, расширенная аналитика, продвинутые инструменты продвижения

## Философия дизайна

Sacral Track использует современный, элегантный дизайн, ориентированный на:

- **Стекломорфизм**: Полупрозрачные элементы с эффектами размытия
- **Градиентная эстетика**: Богатые цветовые градиенты для визуальной привлекательности
- **Микровзаимодействия**: Тонкие анимации для улучшения пользовательского опыта
- **Темная тема**: Удобный для глаз темный интерфейс с акцентными цветами
- **Последовательный брендинг**: Целостный визуальный язык во всех компонентах

## Начало работы

### Для пользователей

1. Создайте свою учетную запись
2. Заполните свой профиль
3. Изучайте треки или загружайте свою музыку
4. Подключайтесь к другим пользователям через систему Vibe
5. Оценивайте контент и становитесь частью системы ранжирования

### Для разработчиков

1. Клонируйте репозиторий
2. Установите зависимости с помощью `npm install`
3. Настройте переменные окружения для подключения к Appwrite
4. Запустите сервер разработки с помощью `npm run dev`
5. Доступ к приложению по адресу `localhost:3000`

## Будущие планы

- **Музыкальные NFT**: Интеграция блокчейна для эксклюзивного контента
- **Живые сессии**: Возможности стриминга аудио в реальном времени
- **Расширенная аналитика**: Продвинутая аналитика для артистов
- **Мобильные приложения**: Нативные приложения для iOS и Android
- **Общественные плейлисты**: Совместное создание плейлистов
- **События и виртуальные концерты**: Интеграция с живыми музыкальными событиями
