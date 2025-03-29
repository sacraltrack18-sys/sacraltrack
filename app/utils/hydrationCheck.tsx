"use client";

import { useEffect, useState } from 'react';

/**
 * Хук для логирования гидратации компонента
 * Используйте в компонентах, где подозреваете проблемы с гидратацией
 * @param componentName Имя компонента для логирования
 */
export function useHydrationCheck(componentName: string) {
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    setIsHydrated(true);
    console.log(`[HydrationCheck] Component '${componentName}' is hydrated`);
    
    // Проверка атрибутов
    const recordAttributes = (element: Element | null) => {
      if (!element) return;
      
      const attributes: Record<string, string> = {};
      Array.from(element.attributes).forEach(attr => {
        attributes[attr.name] = attr.value;
      });
      
      if (Object.keys(attributes).length > 0) {
        console.log(`[HydrationCheck] ${componentName} attributes:`, attributes);
      }
    };
    
    // Запись всех DOM атрибутов компонента
    if (typeof document !== 'undefined') {
      // Ищем элемент с атрибутом data-hydration-id
      const element = document.querySelector(`[data-hydration-id="${componentName}"]`);
      recordAttributes(element);
    }
  }, [componentName]);
  
  return {
    isHydrated,
    // Атрибут для добавления к корневому компоненту для идентификации
    hydrationProps: {
      'data-hydration-id': componentName,
      'data-hydrated': isHydrated ? 'true' : 'false',
    }
  };
}

/**
 * HOC для обертывания компонентов с проверкой гидратации
 */
export function withHydrationCheck<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function HydrationCheckedComponent(props: P) {
    const { hydrationProps } = useHydrationCheck(componentName);
    
    return (
      <div {...hydrationProps} style={{ display: 'contents' }}>
        <Component {...props} />
      </div>
    );
  };
} 