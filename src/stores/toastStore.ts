// Toast Store - Global toast/notification management

import { create } from 'zustand';
import type { Toast, ToastOptions, StatChange } from '../types/toast';
import type { InteractionType } from '../types/pet-status';

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, options?: ToastOptions) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (message: string, options: ToastOptions = {}) => {
    const toast: Toast = {
      id: generateId(),
      type: options.type || 'info',
      message,
      duration: options.duration ?? 3000,
      timestamp: Date.now(),
      interactionType: options.interactionType,
      statChanges: options.statChanges,
    };

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    // Auto-remove after duration (duration is always defined due to default value)
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== toast.id),
        }));
      }, toast.duration);
    }
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },
}));

// Convenience functions for different toast types
export const toast = {
  info: (message: string, duration?: number) => {
    useToastStore.getState().addToast(message, { type: 'info', duration });
  },
  success: (message: string, duration?: number) => {
    useToastStore.getState().addToast(message, { type: 'success', duration });
  },
  warning: (message: string, duration?: number) => {
    useToastStore.getState().addToast(message, { type: 'warning', duration });
  },
  error: (message: string, duration?: number) => {
    useToastStore.getState().addToast(message, { type: 'error', duration: duration ?? 5000 });
  },
  /**
   * 互动反馈 Toast
   * 显示亲密度变化等互动结果
   */
  interaction: (
    interactionType: InteractionType,
    message: string,
    statChanges?: StatChange[],
    duration?: number
  ) => {
    useToastStore.getState().addToast(message, {
      type: 'interaction',
      duration: duration ?? 2500,
      interactionType,
      statChanges,
    });
  },
};
