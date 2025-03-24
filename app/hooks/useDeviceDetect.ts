import { useState, useEffect } from 'react';

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
}

/**
 * Хук для определения типа устройства пользователя
 * @returns Объект с информацией о типе устройства
 */
const useDeviceDetect = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
  });

  useEffect(() => {
    const checkDevice = () => {
      // Проверяем, запущен ли код в браузере
      if (typeof window === 'undefined') {
        return;
      }

      // Проверка на touch устройство
      const isTouchDevice = 'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0;

      // Проверка на мобильное устройство по user-agent
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i;
      const isMobileByUserAgent = mobileRegex.test(navigator.userAgent);

      // Проверка размера экрана
      const width = window.innerWidth;
      const isMobileByScreen = width < 768;
      const isTabletByScreen = width >= 768 && width < 1024;
      const isDesktopByScreen = width >= 1024;

      // Определяем итоговые значения
      const isMobile = isMobileByUserAgent && isMobileByScreen;
      const isTablet = (isMobileByUserAgent && isTabletByScreen) || 
                      (!isMobileByUserAgent && isTabletByScreen);
      const isDesktop = isDesktopByScreen && !isMobileByUserAgent;

      setDeviceInfo({
        isMobile: isMobile || isMobileByScreen,
        isTablet,
        isDesktop,
        isTouchDevice,
      });
    };

    // Проверяем устройство при монтировании компонента
    checkDevice();

    // Добавляем слушатель изменения размера экрана
    window.addEventListener('resize', checkDevice);

    // Очищаем слушатель
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return deviceInfo;
};

export default useDeviceDetect; 