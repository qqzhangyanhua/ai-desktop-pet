/**
 * Prompt Dialog Store
 * 通用输入对话框状态管理
 */

import { create } from 'zustand';

interface PromptDialogConfig {
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
}

interface PromptDialogState {
  isOpen: boolean;
  config: PromptDialogConfig | null;
  resolve: ((value: string | null) => void) | null;
}

interface PromptDialogActions {
  /**
   * 打开输入对话框
   * @returns Promise<string | null> 用户输入的值，取消返回 null
   */
  prompt: (config: PromptDialogConfig) => Promise<string | null>;
  /**
   * 确认输入
   */
  confirm: (value: string) => void;
  /**
   * 取消对话框
   */
  cancel: () => void;
}

type PromptDialogStore = PromptDialogState & PromptDialogActions;

export const usePromptDialogStore = create<PromptDialogStore>((set, get) => ({
  isOpen: false,
  config: null,
  resolve: null,

  prompt: (config: PromptDialogConfig) => {
    return new Promise<string | null>((resolve) => {
      set({
        isOpen: true,
        config,
        resolve,
      });
    });
  },

  confirm: (value: string) => {
    const { resolve } = get();
    if (resolve) {
      resolve(value);
    }
    set({
      isOpen: false,
      config: null,
      resolve: null,
    });
  },

  cancel: () => {
    const { resolve } = get();
    if (resolve) {
      resolve(null);
    }
    set({
      isOpen: false,
      config: null,
      resolve: null,
    });
  },
}));
