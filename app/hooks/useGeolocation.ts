import { useState, useEffect } from 'react';

interface LocationData {
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Хук для определения местоположения пользователя
 */
const useGeolocation = () => {
  const [locationData, setLocationData] = useState<LocationData>({
    latitude: null,
    longitude: null,
    locationName: null,
    isLoading: false,
    error: null
  });

  /**
   * Получает координаты пользователя с помощью Geolocation API
   */
  const getCoordinates = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      });
    });
  };

  /**
   * Получает название местоположения по координатам с помощью Geocoding API
   */
  const getLocationName = async (latitude: number, longitude: number): Promise<string> => {
    try {
      // Используем Nominatim API (OpenStreetMap) для получения информации о местоположении
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'ru,en',  // Приоритет языка
            'User-Agent': 'SacralTrack Vibe App'  // Обязательно указывать User-Agent для Nominatim
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch location data');
      }

      const data = await response.json();
      
      // Формируем читаемое название местоположения
      let locationName = '';
      
      if (data.address) {
        // Приоритет элементов для отображения
        const cityElements = [
          data.address.city,
          data.address.town,
          data.address.village,
          data.address.suburb
        ].filter(Boolean);
        
        const city = cityElements.length > 0 ? cityElements[0] : '';
        
        if (data.address.road || data.address.amenity) {
          locationName = `${data.address.road || data.address.amenity}`;
          if (city) locationName += `, ${city}`;
        } else if (city) {
          locationName = city;
        } else if (data.address.country) {
          locationName = data.address.country;
        }
      }
      
      // Если не удалось получить читаемое название, используем display_name
      return locationName || data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.error('Error getting location name:', error);
      // В случае ошибки возвращаем координаты
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  };

  /**
   * Определяет местоположение пользователя и получает его название
   * @param {boolean} silent - если true, не будет выбрасывать исключение при ошибке
   */
  const getCurrentLocation = async (silent = false) => {
    setLocationData(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const position = await getCoordinates();
      const { latitude, longitude } = position.coords;
      
      const locationName = await getLocationName(latitude, longitude);
      
      setLocationData({
        latitude,
        longitude,
        locationName,
        isLoading: false,
        error: null
      });
      
      return locationName;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Используем более информативное сообщение и не логируем, если пользователь просто отклонил доступ к геолокации
      if (error instanceof GeolocationPositionError) {
        let userFriendlyMessage;
        switch (error.code) {
          case GeolocationPositionError.PERMISSION_DENIED:
            userFriendlyMessage = 'Location access denied by user';
            break;
          case GeolocationPositionError.POSITION_UNAVAILABLE:
            userFriendlyMessage = 'Location information unavailable';
            break;
          case GeolocationPositionError.TIMEOUT:
            userFriendlyMessage = 'Location request timed out';
            break;
          default:
            userFriendlyMessage = errorMessage;
        }
        
        // Для ошибки типа "пользователь не дал разрешения" не логируем как ошибку
        if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
          console.log('User denied location permission');
        } else {
          console.error('Error getting location:', userFriendlyMessage);
        }
        
        setLocationData({
          latitude: null,
          longitude: null,
          locationName: null,
          isLoading: false,
          error: userFriendlyMessage
        });
      } else {
        // Для других ошибок логируем и устанавливаем ошибку
        console.warn('Error getting location:', errorMessage);
        
        setLocationData({
          latitude: null,
          longitude: null,
          locationName: null,
          isLoading: false,
          error: errorMessage
        });
      }
      
      // Выбрасываем ошибку только если не в тихом режиме
      if (!silent) {
        throw error;
      }
      
      return null;
    }
  };

  return {
    ...locationData,
    getCurrentLocation
  };
};

export default useGeolocation; 