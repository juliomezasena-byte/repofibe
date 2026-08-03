import { useCallback, useEffect, useState } from 'react';

function readProgress(key) {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function useLearningProgress(userKey = 'anonymous') {
  const storageKey = `cryptic-learning-progress-v1:${userKey}`;
  const [progress, setProgress] = useState(() => readProgress(storageKey));
  const [loadedKey, setLoadedKey] = useState(storageKey);

  useEffect(() => {
    setProgress(readProgress(storageKey));
    setLoadedKey(storageKey);
  }, [storageKey]);

  const updateProgress = useCallback((updater) => {
    setProgress((current) => updater instanceof Function ? updater(current) : updater);
  }, []);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch {
      // El progreso en memoria sigue funcionando si el almacenamiento está lleno.
    }
  }, [progress, loadedKey, storageKey]);

  return [progress, updateProgress];
}
