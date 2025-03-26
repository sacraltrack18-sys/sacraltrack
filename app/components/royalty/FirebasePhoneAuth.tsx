import React, { useEffect, useRef } from 'react';
import { FaPhoneAlt, FaUser } from 'react-icons/fa';

interface FirebasePhoneAuthProps {
  buttonId: string;
  isVisible?: boolean;
}

/**
 * Компонент для поддержки верификации телефона через Firebase reCAPTCHA
 * Создает контейнер для размещения reCAPTCHA виджета
 */
const FirebasePhoneAuth: React.FC<FirebasePhoneAuthProps> = ({ 
  buttonId,
  isVisible = false
}) => {
  const recaptchaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Создаем div для рекапчи если он еще не существует
    if (!document.getElementById(`${buttonId}-container`)) {
      const recaptchaContainer = document.createElement('div');
      recaptchaContainer.id = `${buttonId}-container`;
      recaptchaContainer.style.position = 'absolute';
      recaptchaContainer.style.bottom = '10px';
      recaptchaContainer.style.left = '10px';
      recaptchaContainer.style.zIndex = '1000';
      recaptchaContainer.style.opacity = isVisible ? '1' : '0';
      document.body.appendChild(recaptchaContainer);
      
      // Создаем элемент для кнопки верификации
      const buttonElement = document.createElement('div');
      buttonElement.id = buttonId;
      buttonElement.style.display = 'none';
      recaptchaContainer.appendChild(buttonElement);
    }
    
    return () => {
      // При размонтировании компонента удаляем контейнер
      const container = document.getElementById(`${buttonId}-container`);
      if (container) {
        document.body.removeChild(container);
      }
    };
  }, [buttonId, isVisible]);

  return (
    <div ref={recaptchaRef} className="firebase-recaptcha-container">
      {/* Этот div для тестирования, чтобы убедиться, что компонент рендерится */}
      <div className="hidden">Firebase Phone Auth Component (ID: {buttonId})</div>
    </div>
  );
};

export default FirebasePhoneAuth; 