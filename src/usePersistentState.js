import { useState, useEffect, useCallback } from 'react';

const PREFIX = 'cssObras_';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // almacenamiento lleno o no disponible — la app sigue funcionando en memoria
  }
}

/**
 * Hook tipo useState pero persistido en localStorage.
 * Uso: const [obras, setObras] = usePersistentState('obras', []);
 */
export function usePersistentState(key, fallback) {
  const [state, setState] = useState(() => load(key, fallback));

  useEffect(() => {
    save(key, state);
  }, [key, state]);

  return [state, setState];
}

export function usePersistentFlag(key) {
  const [flag, setFlagState] = useState(() => load(key, false));
  const setFlag = useCallback((v) => {
    setFlagState(v);
    save(key, v);
  }, [key]);
  return [flag, setFlag];
}
