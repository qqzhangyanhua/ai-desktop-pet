import { isTauri } from '@tauri-apps/api/core';
import { confirm, type ConfirmDialogOptions } from '@tauri-apps/plugin-dialog';

export async function confirmAction(
  message: string,
  options?: ConfirmDialogOptions | string
): Promise<boolean> {
  if (!isTauri()) {
    return window.confirm(message);
  }

  return await confirm(message, options ?? { title: '请确认', kind: 'warning' });
}

