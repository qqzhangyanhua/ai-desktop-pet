import { useState, useCallback } from 'react';
import type { ToastMessage, ToastType } from './Toast';

let idCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (type: ToastType, title: string, description?: string, duration?: number) => {
      const id = `toast-${++idCounter}-${Date.now()}`;
      const newToast: ToastMessage = {
        id,
        type,
        title,
        description,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto-remove after duration (default 3s)
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration || 3000);

      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (title: string, description?: string, duration?: number) => {
      return showToast('success', title, description, duration);
    },
    [showToast]
  );

  const error = useCallback(
    (title: string, description?: string, duration?: number) => {
      return showToast('error', title, description, duration);
    },
    [showToast]
  );

  const info = useCallback(
    (title: string, description?: string, duration?: number) => {
      return showToast('info', title, description, duration);
    },
    [showToast]
  );

  const warning = useCallback(
    (title: string, description?: string, duration?: number) => {
      return showToast('warning', title, description, duration);
    },
    [showToast]
  );

  return {
    toasts,
    addToast: showToast,
    removeToast,
    success,
    error,
    info,
    warning,
  };
}
