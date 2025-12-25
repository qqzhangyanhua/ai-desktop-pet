// Toast types

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  timestamp: number;
}

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
}
