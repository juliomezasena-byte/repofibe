import { useState } from 'react';

// Hook robusto que maneja cuotas llenas de localStorage (Safari Incógnito)
export function useLocalStorage(key, initialValue) {
  // Estado inicial desde storage o fallback
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error leyendo localStorage clave "${key}":`, error);
      return initialValue;
    }
  });

  // Setter envuelto en try/catch para QuotaExceededError
  const setValue = (value) => {
    try {
      // Permite función al igual que useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error escribiendo en localStorage clave "${key}" (posible QuotaExceededError):`, error);
      // Falla silenciosamente a nivel de persistencia, pero el estado de React se actualizó de todos modos
    }
  };

  return [storedValue, setValue];
}
